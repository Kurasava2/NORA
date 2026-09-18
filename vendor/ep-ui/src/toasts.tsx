"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
export type ToastTone = "success" | "error" | "info" | "warning";
export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
  action?: { label: string; onClick: () => void };
}
export interface ToastProps extends ToastOptions {
  onDismiss: () => void;
  closeLabel?: string;
}
function StatusIcon({ tone }: { tone: ToastTone }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {tone === "warning" ? (
        <>
          <path d="m10.3 3.9-8.2 14.2A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4m0 4h.01" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="10" />
          {tone === "success" ? (
            <path d="m8 12 3 3 5-6" />
          ) : tone === "error" ? (
            <path d="M12 8v4m0 4h.01" />
          ) : (
            <path d="M12 11v6m0-10h.01" />
          )}
        </>
      )}
    </svg>
  );
}
export function Toast({
  title,
  message,
  tone = "info",
  duration = 0,
  action,
  onDismiss,
  closeLabel = "Закрыть уведомление",
}: ToastProps) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(false);
  const remaining = useRef(duration);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    remaining.current = duration;
  }, [duration]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (duration <= 0 || hover || focus || hidden) return;
    const start = Date.now();
    const timer = setTimeout(
      () => dismissRef.current(),
      Math.max(0, remaining.current),
    );
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - start));
    };
  }, [duration, hover, focus, hidden]);
  return (
    <div
      className="ep-toast"
      data-toast-tone={tone}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false);
      }}
    >
      <span className="ep-toast-icon">
        <StatusIcon tone={tone} />
      </span>
      <div className="ep-toast-content">
        <div role={tone === "error" ? "alert" : "status"} aria-atomic="true">
          <p className="ep-toast-title">{title}</p>
          {message && <p className="ep-toast-message">{message}</p>}
        </div>
        {action && (
          <button
            type="button"
            className="ep-toast-action"
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        className="ep-toast-close"
        aria-label={closeLabel}
        onClick={onDismiss}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
interface StoredToast extends ToastOptions {
  id: string;
}
export interface ToastController {
  show: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  count: number;
}
const ToastContext = createContext<ToastController | null>(null);
export interface ToastProviderProps {
  children: ReactNode;
  maxVisible?: number;
  duration?: number;
  position?: "top-right" | "bottom-right";
  label?: string;
  closeLabel?: string;
}
export function ToastProvider({
  children,
  maxVisible = 3,
  duration = 4500,
  position = "top-right",
  label = "Уведомления",
  closeLabel = "Закрыть уведомление",
}: ToastProviderProps) {
  const [items, setItems] = useState<StoredToast[]>([]);
  const counter = useRef(0);
  const show = useCallback(
    (options: ToastOptions) => {
      const id = `ep-toast-${++counter.current}`;
      setItems((prev) => [
        ...prev,
        {
          ...options,
          duration:
            options.duration ?? (options.tone === "error" ? 0 : duration),
          id,
        },
      ]);
      return id;
    },
    [duration],
  );
  const dismiss = useCallback(
    (id: string) => setItems((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(
    () => ({ show, dismiss, clear, count: items.length }),
    [show, dismiss, clear, items.length],
  );
  const limit = Number.isFinite(maxVisible)
    ? Math.max(1, Math.floor(maxVisible))
    : 3;
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="ep-toast-stack"
        data-position={position}
        role="region"
        aria-label={label}
      >
        {items.slice(0, limit).map((item) => (
          <Toast
            key={item.id}
            {...item}
            closeLabel={closeLabel}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
        {items.length > limit && (
          <div className="ep-toast-queued">
            В очереди: {items.length - limit}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast(): ToastController {
  const value = useContext(ToastContext);
  if (!value) throw Error("useToast must be used inside ToastProvider");
  return value;
}
