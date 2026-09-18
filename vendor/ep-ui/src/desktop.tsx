"use client";
import {
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { MenuSurface, usePopup, type MenuItem } from "./overlays";
export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  group?: string;
}
export interface SidebarProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onChange"
> {
  items: SidebarItem[];
  activeId: string;
  onActiveChange: (id: string) => void;
  label: string;
  header?: ReactNode;
  footer?: ReactNode;
  collapsed?: boolean;
  onCollapsedChange?: (value: boolean) => void;
  collapseLabel?: string;
  expandLabel?: string;
}
export function Sidebar({
  items,
  activeId,
  onActiveChange,
  label,
  header,
  footer,
  collapsed = false,
  onCollapsedChange,
  collapseLabel = "Свернуть панель",
  expandLabel = "Развернуть панель",
  className = "",
  ...props
}: SidebarProps) {
  return (
    <nav
      {...props}
      aria-label={label}
      className={`ep-sidebar ${className}`}
      data-collapsed={collapsed}
    >
      {(header || onCollapsedChange) && (
        <div className="ep-sidebar-head">
          {header && <div className="ep-sidebar-heading">{header}</div>}
          {onCollapsedChange && (
            <button
              type="button"
              aria-label={collapsed ? expandLabel : collapseLabel}
              aria-expanded={!collapsed}
              className="ep-sidebar-collapse"
              onClick={() => onCollapsedChange(!collapsed)}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: collapsed ? "rotate(180deg)" : undefined }}
              >
                <path d="m14 6-6 6 6 6" />
              </svg>
            </button>
          )}
        </div>
      )}
      <div className="ep-sidebar-items">
        {items.map((item, index) => (
          <div key={item.id} className="ep-sidebar-entry">
            {item.group && item.group !== items[index - 1]?.group && (
              <div className="ep-sidebar-group">{item.group}</div>
            )}
            <button
              type="button"
              className="ep-sidebar-item"
              aria-label={item.label}
              title={item.label}
              aria-current={activeId === item.id ? "page" : undefined}
              disabled={item.disabled}
              onClick={() => onActiveChange(item.id)}
            >
              <span className="ep-sidebar-icon" aria-hidden="true">
                {item.icon ?? item.label.slice(0, 1)}
              </span>
              <span className="ep-sidebar-label">{item.label}</span>
              {item.badge !== undefined && (
                <span className="ep-sidebar-badge" aria-hidden="true">
                  {item.badge}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
      {footer && <div className="ep-sidebar-footer">{footer}</div>}
    </nav>
  );
}
export interface MenuBarEntry {
  id: string;
  label: string;
  items: MenuItem[];
  disabled?: boolean;
}
export interface MenuBarProps extends HTMLAttributes<HTMLDivElement> {
  menus: MenuBarEntry[];
  label: string;
}
export function MenuBar({
  menus,
  label,
  className = "",
  ...props
}: MenuBarProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const [initial, setInitial] = useState<"first" | "last">("first");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const anchor = useRef<HTMLButtonElement | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  const id = useId();
  const available = menus
    .map((m, i) => (m.disabled ? -1 : i))
    .filter((i) => i >= 0);
  const close = (restore = false) => {
    setOpen(null);
    if (restore && open !== null) buttons.current[open]?.focus();
  };
  const openMenu = (index: number, last = false) => {
    if (menus[index]?.disabled) return;
    anchor.current = buttons.current[index];
    setFocused(index);
    setInitial(last ? "last" : "first");
    setOpen(index);
  };
  const move = (from: number, direction: -1 | 1, reopen: boolean) => {
    const pos = available.indexOf(from);
    const next =
      available[(pos + direction + available.length) % available.length];
    if (next === undefined) return;
    setFocused(next);
    if (reopen) openMenu(next);
    else buttons.current[next]?.focus();
  };
  usePopup(open !== null, anchor, popup, close, { key: String(open) });
  const tabIndex = available.includes(focused) ? focused : available[0];
  return (
    <div
      {...props}
      role="menubar"
      aria-label={label}
      className={`ep-menubar ${className}`}
    >
      {menus.map((menu, index) => (
        <button
          key={menu.id}
          ref={(n) => {
            buttons.current[index] = n;
          }}
          type="button"
          role="menuitem"
          tabIndex={index === tabIndex ? 0 : -1}
          disabled={menu.disabled}
          aria-haspopup="menu"
          aria-expanded={open === index}
          aria-controls={open === index ? id : undefined}
          onFocus={() => setFocused(index)}
          onClick={() => (open === index ? close() : openMenu(index))}
          onPointerEnter={() => {
            if (open !== null && open !== index) openMenu(index);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              move(index, e.key === "ArrowRight" ? 1 : -1, open !== null);
            } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              openMenu(index, e.key === "ArrowUp");
            } else if (e.key === "Home" || e.key === "End") {
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? available[0]
                  : available[available.length - 1];
              if (next !== undefined) {
                setFocused(next);
                buttons.current[next]?.focus();
              }
            } else if (e.key === "Escape" && open !== null) {
              e.preventDefault();
              e.stopPropagation();
              close(true);
            }
          }}
        >
          {menu.label}
        </button>
      ))}
      {open !== null && menus[open] && (
        <MenuSurface
          anchor={anchor}
          key={menus[open].id}
          id={id}
          label={menus[open].label}
          menuRef={popup}
          items={menus[open].items}
          onClose={close}
          initialFocus={initial}
          onHorizontal={(direction) => move(open, direction, true)}
        />
      )}
    </div>
  );
}
export interface StatusBarItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "error";
  onClick?: () => void;
}
export interface StatusBarProps extends HTMLAttributes<HTMLDivElement> {
  message: ReactNode;
  items?: StatusBarItem[];
}
export function StatusBar({
  message,
  items = [],
  className = "",
  ...props
}: StatusBarProps) {
  return (
    <div {...props} className={`ep-statusbar ${className}`}>
      <span className="ep-status-message" role="status" aria-atomic="true">
        {message}
      </span>
      <div className="ep-status-items">
        {items.map((item) => {
          const content = (
            <>
              {item.icon && (
                <span className="ep-status-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
            </>
          );
          return item.onClick ? (
            <button
              key={item.id}
              type="button"
              data-tone={item.tone ?? "neutral"}
              onClick={item.onClick}
            >
              {content}
            </button>
          ) : (
            <span key={item.id} data-tone={item.tone ?? "neutral"}>
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}
