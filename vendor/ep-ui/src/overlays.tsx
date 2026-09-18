"use client";
import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type InputHTMLAttributes,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
} from "react";

import { PopupPortal, showPopup } from "./popup";

type Point = { x: number; y: number };
export function usePopup(
  open: boolean,
  anchor: RefObject<HTMLElement>,
  popup: RefObject<HTMLDivElement>,
  close: () => void,
  {
    point,
    above = false,
    matchWidth = false,
    gap = 6,
    key = "",
  }: {
    point?: Point;
    above?: boolean;
    matchWidth?: boolean;
    gap?: number;
    key?: string;
  } = {},
) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useLayoutEffect(() => {
    const el = popup.current,
      trigger = anchor.current;
    if (!open || !el || !trigger) return;
    const hidePopup = showPopup(el);
    const position = () => {
      const r = trigger.getBoundingClientRect();
      const width = Math.min(
        matchWidth ? r.width : el.offsetWidth,
        window.innerWidth - 16,
      );
      const x = point?.x ?? r.left;
      const bottom = point?.y ?? r.bottom;
      const top = point?.y ?? r.top;
      const belowSpace = window.innerHeight - bottom - gap - 8,
        aboveSpace = top - gap - 8;
      const up = above
        ? aboveSpace >= Math.min(el.scrollHeight, 240)
        : belowSpace < Math.min(el.scrollHeight, 240) &&
          aboveSpace > belowSpace;
      Object.assign(el.style, {
        width: `${width}px`,
        maxHeight: `${Math.max(40, Math.min(320, up ? aboveSpace : belowSpace))}px`,
        left: `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`,
        top: up ? "auto" : `${Math.max(8, bottom + gap)}px`,
        bottom: up
          ? `${Math.max(8, window.innerHeight - top + gap)}px`
          : "auto",
      });
    };
    position();
    const outside = (e: PointerEvent) => {
      if (!el.contains(e.target as Node) && !trigger.contains(e.target as Node))
        closeRef.current();
    };
    const resize = () => closeRef.current();
    const scroll = (e: Event) => {
      if (!el.contains(e.target as Node)) {
        const next = trigger.getBoundingClientRect();
        if (point || next.bottom < 0 || next.top > window.innerHeight)
          closeRef.current();
        else position();
      }
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", scroll, true);
    return () => {
      hidePopup();
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open, point?.x, point?.y, above, matchWidth, gap, key]);
}
function scrollRow(list: HTMLDivElement | null, row: HTMLElement | null) {
  if (!list || !row) return;
  const box = list.getBoundingClientRect(),
    r = row.getBoundingClientRect();
  if (r.top < box.top + 8) list.scrollTop -= box.top + 8 - r.top;
  else if (r.bottom > box.bottom - 8)
    list.scrollTop += r.bottom - box.bottom + 8;
}
export interface ComboboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size"
> {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onSelectValue?: (value: string) => void;
  emptyText?: string;
  toggleLabel?: string;
}
/** Source Combobox: editable suggestions, free text remains a valid value. */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  function Combobox(
    {
      value,
      onChange,
      options,
      onSelectValue,
      emptyText = "Ничего не найдено",
      toggleLabel = "Показать варианты",
      className = "",
      disabled,
      onFocus,
      onBlur,
      onKeyDown,
      ...props
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const input = useRef<HTMLInputElement | null>(null);
    const wrap = useRef<HTMLDivElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const id = useId();
    const filtered = [...new Set(options)].filter((o) =>
      o.toLocaleLowerCase().includes(value.toLocaleLowerCase()),
    );
    usePopup(open, wrap, list, () => setOpen(false), {
      matchWidth: true,
      gap: 4,
      key: filtered.join("\0"),
    });
    useEffect(() => {
      scrollRow(
        list.current,
        list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`) ??
          null,
      );
    }, [active]);
    useEffect(() => {
      if (disabled) setOpen(false);
    }, [disabled]);
    const choose = (v: string) => {
      onChange(v);
      onSelectValue?.(v);
      setOpen(false);
      setActive(-1);
    };
    return (
      <div className={`ep-combobox ${className}`} ref={wrap}>
        <input
          {...props}
          ref={(node) => {
            input.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          disabled={disabled}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-activedescendant={
            open && active >= 0 && active < filtered.length
              ? `${id}-${active}`
              : undefined
          }
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={(e) => {
            setOpen(true);
            onFocus?.(e);
          }}
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
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((n) =>
                filtered.length
                  ? n < 0
                    ? e.key === "ArrowDown"
                      ? 0
                      : filtered.length - 1
                    : (n + (e.key === "ArrowDown" ? 1 : -1) + filtered.length) %
                      filtered.length
                  : -1,
              );
              return;
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (active >= 0 && filtered[active]) choose(filtered[active]);
              else if (filtered.length === 1) choose(filtered[0]);
              else setOpen(false);
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={toggleLabel}
          aria-expanded={open}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            const next = !open;
            input.current?.focus();
            setOpen(next);
            setActive(-1);
          }}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
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
          <PopupPortal anchor={wrap}>
            <div
              ref={list}
              id={id}
              role="listbox"
              aria-label={
                props["aria-label"] || props.placeholder || toggleLabel
              }
              className="ep-combobox-menu"
              onPointerDown={(e) => e.preventDefault()}
            >
              {filtered.length ? (
                filtered.map((o, i) => (
                  <div
                    key={o}
                    id={`${id}-${i}`}
                    role="option"
                    aria-selected={o === value}
                    data-index={i}
                    data-active={i === active || undefined}
                    onPointerMove={() => setActive(i)}
                    onClick={() => choose(o)}
                  >
                    {o}
                  </div>
                ))
              ) : (
                <div className="ep-popup-empty" role="status">
                  {emptyText}
                </div>
              )}
            </div>
          </PopupPortal>
        )}
      </div>
    );
  },
);
export interface TooltipProps {
  content: ReactNode;
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  delay?: number;
  side?: "top" | "bottom";
  disabled?: boolean;
}
export function Tooltip({
  content,
  children,
  delay = 350,
  side = "top",
  disabled = false,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();
  const cancel = () => clearTimeout(timer.current);
  const show = () => {
    cancel();
    if (!disabled) timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    cancel();
    timer.current = setTimeout(() => setOpen(false), 100);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (disabled) {
      cancel();
      setOpen(false);
    }
  }, [disabled]);
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancel();
        setOpen(false);
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", escape, true);
    return () => document.removeEventListener("keydown", escape, true);
  }, [open]);
  usePopup(open, wrap, bubble, () => setOpen(false), {
    above: side === "top",
    gap: 8,
  });
  return (
    <span
      ref={wrap}
      className="ep-tooltip-anchor"
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={() => {
        cancel();
        setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          cancel();
          setOpen(false);
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {cloneElement(children, {
        "aria-describedby":
          [children.props["aria-describedby"], open ? id : undefined]
            .filter(Boolean)
            .join(" ") || undefined,
      })}
      {open && (
        <PopupPortal anchor={wrap}>
          <div
            ref={bubble}
            id={id}
            role="tooltip"
            className="ep-tooltip"
            onPointerEnter={() => {
              cancel();
              setOpen(true);
            }}
            onPointerLeave={hide}
          >
            {content}
          </div>
        </PopupPortal>
      )}
    </span>
  );
}
export type MenuItem =
  | {
      id: string;
      label: string;
      onSelect: () => void;
      icon?: ReactNode;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
    }
  | { id: string; separator: true };
function actionable(
  item: MenuItem,
): item is Exclude<MenuItem, { separator: true }> {
  return !("separator" in item);
}
export function MenuSurface({
  anchor,
  items,
  label,
  onClose,
  menuRef,
  id,
  onHorizontal,
  initialFocus = "first",
}: {
  anchor: RefObject<HTMLElement>;
  items: MenuItem[];
  label: string;
  onClose: (restore?: boolean) => void;
  menuRef: RefObject<HTMLDivElement>;
  id: string;
  onHorizontal?: (direction: -1 | 1) => void;
  initialFocus?: "first" | "last";
}) {
  const buttons = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ) ?? [],
    );
  const search = useRef({ text: "", time: 0 });
  useEffect(() => {
    const candidates = buttons();
    (
      candidates[initialFocus === "last" ? candidates.length - 1 : 0] ??
      menuRef.current
    )?.focus();
  }, []);
  return (
    <PopupPortal anchor={anchor}>
      <div
        ref={menuRef}
        id={id}
        tabIndex={-1}
        role="menu"
        aria-label={label}
        className="ep-action-menu"
        onKeyDown={(e) => {
          if (
            onHorizontal &&
            (e.key === "ArrowLeft" || e.key === "ArrowRight")
          ) {
            e.preventDefault();
            e.stopPropagation();
            onHorizontal(e.key === "ArrowLeft" ? -1 : 1);
            return;
          }
          const available = buttons();
          const at = available.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          let index = -1;
          if (e.key === "ArrowDown") index = (at + 1) % available.length;
          if (e.key === "ArrowUp")
            index = (at - 1 + available.length) % available.length;
          if (e.key === "Home") index = 0;
          if (e.key === "End") index = available.length - 1;
          if (index >= 0) {
            e.preventDefault();
            e.stopPropagation();
            available[index]?.focus();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onClose(true);
            return;
          }
          if (e.key === "Tab") {
            onClose(true);
            return;
          }
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            const now = Date.now();
            search.current = {
              text:
                (now - search.current.time < 650 ? search.current.text : "") +
                e.key.toLowerCase(),
              time: now,
            };
            available
              .find((b) =>
                b.dataset.label?.toLowerCase().startsWith(search.current.text),
              )
              ?.focus();
          }
        }}
      >
        {items.map((item) =>
          actionable(item) ? (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              data-danger={item.danger || undefined}
              data-label={item.label}
              onClick={() => {
                onClose(true);
                item.onSelect();
              }}
            >
              {item.icon && (
                <span className="ep-menu-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ) : (
            <div key={item.id} role="separator" className="ep-menu-separator" />
          ),
        )}
      </div>
    </PopupPortal>
  );
}
export interface DropdownMenuProps {
  trigger: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  items: MenuItem[];
  label: string;
}
export function DropdownMenu({ trigger, items, label }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = (restore = false) => {
    setOpen(false);
    if (restore) anchor.current?.querySelector("button")?.focus();
  };
  usePopup(open, anchor, menu, close);
  return (
    <span className="ep-menu-anchor" ref={anchor}>
      {cloneElement(trigger, {
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? id : undefined,
        onClick: (e) => {
          trigger.props.onClick?.(e);
          if (!e.defaultPrevented) setOpen((v) => !v);
        },
        onKeyDown: (e) => {
          trigger.props.onKeyDown?.(e);
          if (
            !e.defaultPrevented &&
            (e.key === "ArrowDown" || e.key === "ArrowUp")
          ) {
            e.preventDefault();
            setOpen(true);
          }
        },
      })}
      {open && (
        <MenuSurface
          anchor={anchor}
          items={items}
          label={label}
          onClose={close}
          menuRef={menu}
          id={id}
        />
      )}
    </span>
  );
}
export interface ContextMenuProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  items: MenuItem[];
  label: string;
  children: ReactNode;
}
export function ContextMenu({
  items,
  label,
  children,
  className = "",
  onContextMenu,
  onClick,
  onKeyDown,
  ...props
}: ContextMenuProps) {
  const [point, setPoint] = useState<Point>();
  const anchor = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const prior = useRef<HTMLElement | null>(null);
  const id = useId();
  const close = (restore = false) => {
    setPoint(undefined);
    if (restore)
      (prior.current?.isConnected ? prior.current : anchor.current)?.focus();
  };
  usePopup(!!point, anchor, menu, close, { point, gap: 0 });
  return (
    <div
      {...props}
      ref={anchor}
      tabIndex={props.tabIndex ?? 0}
      role={props.role ?? "group"}
      aria-label={label}
      className={`ep-context-area ${className}`}
      onClick={(e) => {
        onClick?.(e);
        if (
          !e.defaultPrevented &&
          point &&
          !menu.current?.contains(e.target as Node)
        )
          close();
      }}
      onContextMenu={(e) => {
        onContextMenu?.(e);
        if (e.defaultPrevented || menu.current?.contains(e.target as Node))
          return;
        e.preventDefault();
        prior.current = anchor.current?.contains(document.activeElement)
          ? (document.activeElement as HTMLElement)
          : anchor.current;
        setPoint({ x: e.clientX, y: e.clientY });
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          prior.current = document.activeElement as HTMLElement;
          setPoint({ x: r.left + 12, y: r.top + 12 });
        }
      }}
    >
      {children}
      {point && (
        <MenuSurface
          anchor={anchor}
          items={items}
          label={label}
          menuRef={menu}
          id={id}
          onClose={close}
        />
      )}
    </div>
  );
}
