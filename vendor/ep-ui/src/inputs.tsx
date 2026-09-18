"use client";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type HTMLAttributes,
} from "react";
const parse = (s: string): number | null => {
  const text = s.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const rounded = (n: number) => Number(n.toFixed(12));
export interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "type"
  | "value"
  | "defaultValue"
  | "onChange"
  | "min"
  | "max"
  | "step"
  | "size"
> {
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: ReactNode;
  decreaseLabel?: string;
  increaseLabel?: string;
  invalidMessage?: string;
}
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    {
      value,
      onValueChange,
      min,
      max,
      step = 1,
      unit,
      decreaseLabel = "Уменьшить",
      increaseLabel = "Увеличить",
      invalidMessage = "Введите допустимое число",
      className = "",
      style,
      disabled,
      readOnly,
      onBlur,
      onFocus,
      onKeyDown,
      ...props
    },
    ref,
  ) {
    const [draft, setDraft] = useState(value === null ? "" : String(value));
    const input = useRef<HTMLInputElement | null>(null);
    const focused = useRef(false);
    const lo = Number.isFinite(min) ? min! : -Infinity;
    const hi = Number.isFinite(max) ? Math.max(lo, max!) : Infinity;
    const tick = Number.isFinite(step) && step > 0 ? step : 1;
    const current = parse(draft);
    const clamp = (n: number) => Math.min(hi, Math.max(lo, n));
    const normalize = (n: number) =>
      clamp(
        rounded(
          Math.round((n - (Number.isFinite(lo) ? lo : 0)) / tick) * tick +
            (Number.isFinite(lo) ? lo : 0),
        ),
      );
    const invalid =
      draft.trim() !== "" &&
      (current === null ||
        current < lo ||
        current > hi ||
        Math.abs(normalize(current) - current) > 1e-10);
    useEffect(() => {
      if (!focused.current || parse(draft) !== value)
        setDraft(value === null ? "" : String(value));
    }, [value]);
    useEffect(() => {
      input.current?.setCustomValidity(invalid ? invalidMessage : "");
    }, [invalid, invalidMessage]);
    const commit = (n: number | null) => {
      setDraft(n === null ? "" : String(n));
      onValueChange(n);
    };
    const move = (direction: number) => {
      const base = current ?? value ?? (Number.isFinite(lo) ? lo : 0);
      const origin = Number.isFinite(lo) ? lo : 0;
      const index = (base - origin) / tick;
      const next =
        direction > 0
          ? Math.floor(index + 1e-10) + direction
          : Math.ceil(index - 1e-10) + direction;
      commit(clamp(rounded(origin + next * tick)));
    };
    return (
      <div
        className={`ep-number-input ${className}`}
        style={style}
        data-disabled={disabled || undefined}
      >
        <button
          type="button"
          disabled={disabled || readOnly || (current !== null && current <= lo)}
          aria-label={decreaseLabel}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => move(-1)}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <input
          {...props}
          ref={(node) => {
            input.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          type="text"
          role="spinbutton"
          inputMode="decimal"
          disabled={disabled}
          readOnly={readOnly}
          value={draft}
          aria-valuenow={current ?? undefined}
          aria-valuemin={Number.isFinite(lo) ? lo : undefined}
          aria-valuemax={Number.isFinite(hi) ? hi : undefined}
          aria-invalid={props["aria-invalid"] ?? (invalid || undefined)}
          onChange={(e) => {
            setDraft(e.target.value);
            onValueChange(parse(e.target.value));
          }}
          onFocus={(e) => {
            focused.current = true;
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focused.current = false;
            if (current !== null) commit(normalize(current));
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented || disabled || readOnly) return;
            if (
              e.key === "ArrowUp" ||
              e.key === "ArrowDown" ||
              e.key === "PageUp" ||
              e.key === "PageDown"
            ) {
              e.preventDefault();
              move(
                e.key === "ArrowUp"
                  ? 1
                  : e.key === "ArrowDown"
                    ? -1
                    : e.key === "PageUp"
                      ? 10
                      : -10,
              );
            } else if (e.key === "Home" && Number.isFinite(lo)) {
              e.preventDefault();
              commit(lo);
            } else if (e.key === "End" && Number.isFinite(hi)) {
              e.preventDefault();
              commit(hi);
            }
          }}
        />
        {unit && (
          <span className="ep-number-unit" aria-hidden="true">
            {unit}
          </span>
        )}
        <button
          type="button"
          disabled={disabled || readOnly || (current !== null && current >= hi)}
          aria-label={increaseLabel}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => move(1)}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5v14" />
          </svg>
        </button>
      </div>
    );
  },
);
export interface SliderProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "type"
  | "value"
  | "defaultValue"
  | "onChange"
  | "min"
  | "max"
  | "step"
  | "size"
> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  accent?: "blue" | "theme";
}
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    onValueChange,
    showValue = false,
    formatValue,
    accent = "blue",
    className = "",
    style,
    id,
    disabled,
    ...props
  },
  ref,
) {
  const generated = useId();
  const controlId = id ?? generated;
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Math.max(lo, Number.isFinite(max) ? max : 100);
  const tick = Number.isFinite(step) && step > 0 ? step : 1;
  const [internal, setInternal] = useState(defaultValue ?? lo);
  const raw = value ?? internal;
  const steps = Math.max(0, Math.floor((hi - lo) / tick + 1e-10));
  const chosen = Math.max(
    0,
    Math.min(
      steps,
      Math.round(((Number.isFinite(raw) ? raw : lo) - lo) / tick),
    ),
  );
  const current = Math.max(lo, Math.min(hi, rounded(lo + chosen * tick)));
  const percent = hi === lo ? 0 : ((current - lo) / (hi - lo)) * 100;
  return (
    <div
      className={`ep-slider ${className}`}
      data-accent={accent}
      style={
        { ...style, "--ep-slider-progress": `${percent}%` } as CSSProperties
      }
    >
      <input
        {...props}
        ref={ref}
        id={controlId}
        type="range"
        min={lo}
        max={hi}
        step={tick}
        disabled={disabled || lo === hi}
        value={current}
        aria-valuetext={formatValue?.(current)}
        onChange={(e) => {
          const next = Number(e.target.value);
          setInternal(next);
          onValueChange?.(next);
        }}
      />
      {showValue && (
        <output htmlFor={controlId}>
          {formatValue ? formatValue(current) : current}
        </output>
      )}
    </div>
  );
});
export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}
export interface RadioGroupProps extends Omit<
  HTMLAttributes<HTMLFieldSetElement>,
  "onChange" | "defaultValue"
> {
  label: ReactNode;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
}
export function RadioGroup({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  required = false,
  disabled = false,
  orientation = "vertical",
  className = "",
  ...props
}: RadioGroupProps) {
  const id = useId();
  const [internal, setInternal] = useState(defaultValue ?? "");
  const group = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    const form = group.current?.form;
    if (!form) return;
    const reset = () => setInternal(defaultValue ?? "");
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue]);
  const current = value ?? internal;
  return (
    <fieldset
      {...props}
      ref={group}
      className={`ep-radio-group ${className}`}
      disabled={disabled}
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      aria-required={required || undefined}
      data-orientation={orientation}
    >
      <legend id={`${id}-label`} className="ep-label">
        {label}
      </legend>
      <div className="ep-radio-options">
        {options.map((option) => (
          <label
            key={option.value}
            className="ep-radio-option"
            data-checked={current === option.value || undefined}
            data-disabled={disabled || option.disabled || undefined}
          >
            <input
              type="radio"
              name={name ?? id}
              value={option.value}
              required={required}
              checked={current === option.value}
              disabled={disabled || option.disabled}
              onChange={() => {
                setInternal(option.value);
                onValueChange?.(option.value);
              }}
            />
            <span className="ep-radio-mark" aria-hidden="true" />
            <span className="ep-radio-text">
              <span>{option.label}</span>
              {option.description && (
                <span className="ep-radio-description">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
