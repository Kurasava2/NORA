"use client";
import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { PopupPortal, showPopup } from "./popup";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface DropdownProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "value" | "size" | "children"
> {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  label?: string;
  size?: "sm" | "md";
  invalid?: boolean;
}
export const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(
  function Dropdown(
    {
      value,
      onChange,
      options,
      placeholder = "Выберите…",
      label,
      size = "md",
      disabled,
      className = "",
      invalid,
      onKeyDown,
      onBlur,
      ...props
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const menu = useRef<HTMLDivElement>(null);
    const id = useId();
    const search = useRef({ text: "", time: 0 });
    const selected = options.findIndex((o) => o.value === value);
    const available = options
      .map((o, i) => (o.disabled ? -1 : i))
      .filter((i) => i >= 0);
    function start(last = false) {
      setActive(
        selected >= 0 && !options[selected].disabled
          ? selected
          : ((last ? available[available.length - 1] : available[0]) ?? -1),
      );
      setOpen(true);
    }
    function choose(i: number) {
      if (i >= 0 && options[i] && !options[i].disabled) {
        onChange(options[i].value);
        setOpen(false);
        trigger.current?.focus();
      }
    }
    useLayoutEffect(() => {
      const el = menu.current,
        button = trigger.current;
      if (!open || !el || !button) return;
      const hidePopup = showPopup(el);
      const r = button.getBoundingClientRect();
      const width = Math.min(r.width, window.innerWidth - 16);
      const below = window.innerHeight - r.bottom - 16,
        above = r.top - 16;
      const upward = below < Math.min(el.scrollHeight, 260) && above > below;
      const height = Math.min(300, Math.max(48, upward ? above : below));
      Object.assign(el.style, {
        width: `${width}px`,
        maxHeight: `${height}px`,
        left: `${Math.max(8, Math.min(r.left, window.innerWidth - width - 8))}px`,
        top: upward ? "auto" : `${r.bottom + 8}px`,
        bottom: upward ? `${window.innerHeight - r.top + 8}px` : "auto",
      });
      const outside = (e: PointerEvent) => {
        if (
          !el.contains(e.target as Node) &&
          !button.contains(e.target as Node)
        )
          setOpen(false);
      };
      const close = () => setOpen(false);
      const scroll = (e: Event) => {
        if (!el.contains(e.target as Node)) {
          const next = button.getBoundingClientRect();
          if (
            Math.abs(next.top - r.top) > 0.5 ||
            Math.abs(next.left - r.left) > 0.5
          )
            close();
        }
      };
      document.addEventListener("pointerdown", outside);
      window.addEventListener("resize", close);
      window.addEventListener("scroll", scroll, true);
      return () => {
        hidePopup();
        document.removeEventListener("pointerdown", outside);
        window.removeEventListener("resize", close);
        window.removeEventListener("scroll", scroll, true);
      };
    }, [open]);
    useEffect(() => {
      const list = menu.current;
      const item = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
      if (open && list && item) {
        const box = list.getBoundingClientRect(),
          row = item.getBoundingClientRect();
        if (row.top < box.top + 8) list.scrollTop -= box.top + 8 - row.top;
        else if (row.bottom > box.bottom - 8)
          list.scrollTop += row.bottom - box.bottom + 8;
      }
    }, [active, open]);
    useEffect(() => {
      if (disabled) setOpen(false);
    }, [disabled]);
    return (
      <>
        <button
          {...props}
          ref={(node) => {
            trigger.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-activedescendant={
            open && active >= 0 ? `${id}-${active}` : undefined
          }
          aria-invalid={invalid || props["aria-invalid"]}
          disabled={disabled}
          className={`ep-dropdown ep-dropdown--${size} ${className}`}
          onClick={() => (open ? setOpen(false) : start())}
          onBlur={(e) => {
            setOpen(false);
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented) return;
            if (e.key === "Escape" && open) {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              return;
            }
            if (e.key === "Tab") {
              setOpen(false);
              return;
            }
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              if (!open) {
                start(e.key === "ArrowUp" || e.key === "End");
                return;
              }
              const pos = available.indexOf(active);
              const next =
                e.key === "Home"
                  ? available[0]
                  : e.key === "End"
                    ? available[available.length - 1]
                    : available[
                        (pos +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          available.length) %
                          available.length
                      ];
              setActive(next ?? -1);
              return;
            }
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (open) choose(active);
              else start();
              return;
            }
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              const now = Date.now();
              search.current = {
                text:
                  (now - search.current.time < 650 ? search.current.text : "") +
                  e.key.toLowerCase(),
                time: now,
              };
              const next = options.findIndex(
                (o) =>
                  !o.disabled &&
                  o.label.toLowerCase().startsWith(search.current.text),
              );
              if (next >= 0) {
                if (!open) setOpen(true);
                setActive(next);
              }
            }
          }}
        >
          {label && <span className="ep-dropdown-label">{label}</span>}
          <span className="ep-dropdown-value">
            {options[selected]?.label || placeholder}
          </span>
          <svg
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={open ? "ep-chevron-open" : ""}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <PopupPortal anchor={trigger}>
            <div
              ref={menu}
              id={id}
              role="listbox"
              aria-label={props["aria-label"] || label || placeholder}
              className="ep-dropdown-menu"
              onPointerDown={(e) => e.preventDefault()}
            >
              {options.map((option, i) => (
                <div
                  key={option.value}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  data-index={i}
                  data-active={i === active || undefined}
                  className={`ep-dropdown-option ep-dropdown-option--${size}`}
                  onPointerMove={() => {
                    if (!option.disabled) setActive(i);
                  }}
                  onClick={() => choose(i)}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </PopupPortal>
        )}
      </>
    );
  },
);
export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "multiple" | "size"
> {
  options?: DropdownOption[];
  placeholder?: string;
  controlSize?: "sm" | "md";
}
function childOptions(children: ReactNode, disabled = false): DropdownOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
    )
      return [];
    if (child.type === "option")
      return [
        {
          value: String(child.props.value ?? child.props.children ?? ""),
          label: String(child.props.children ?? ""),
          disabled: disabled || child.props.disabled,
        },
      ];
    return childOptions(child.props.children, disabled || child.props.disabled);
  });
}
/** Custom visual control with a hidden native select for HTML forms and standard onChange. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      options,
      children,
      value,
      defaultValue,
      onChange,
      id,
      className,
      style,
      disabled,
      placeholder,
      controlSize = "md",
      ...props
    },
    ref,
  ) {
    const items = options ?? childOptions(children);
    const [internal, setInternal] = useState(
      String(defaultValue ?? items.find((o) => !o.disabled)?.value ?? ""),
    );
    const native = useRef<HTMLSelectElement | null>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const current = value !== undefined ? String(value) : internal;
    useEffect(() => {
      const form = native.current?.form;
      if (!form) return;
      const reset = () =>
        queueMicrotask(() => {
          setInternal(
            String(defaultValue ?? items.find((o) => !o.disabled)?.value ?? ""),
          );
        });
      form.addEventListener("reset", reset);
      return () => form.removeEventListener("reset", reset);
    }, [defaultValue, options]);
    return (
      <>
        <Dropdown
          id={id}
          ref={trigger}
          className={className}
          style={style}
          disabled={disabled}
          value={current}
          size={controlSize}
          options={items}
          placeholder={placeholder}
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          aria-describedby={props["aria-describedby"]}
          aria-invalid={props["aria-invalid"]}
          aria-required={props.required || undefined}
          onChange={(next) => {
            if (native.current) {
              native.current.value = next;
              native.current.dispatchEvent(
                new Event("change", { bubbles: true }),
              );
            }
          }}
        />
        <select
          {...props}
          disabled={disabled}
          ref={(node) => {
            native.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          className="ep-select-native"
          aria-hidden="true"
          tabIndex={-1}
          value={current}
          onChange={(e) => {
            setInternal(e.target.value);
            onChange?.(e);
          }}
          onInvalid={(e) => {
            e.preventDefault();
            trigger.current?.focus();
            props.onInvalid?.(e);
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {items.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      </>
    );
  },
);
