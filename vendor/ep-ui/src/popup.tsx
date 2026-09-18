"use client";
import { type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

function hasPopover() {
  return (
    typeof HTMLElement !== "undefined" &&
    typeof HTMLElement.prototype.showPopover === "function" &&
    typeof HTMLElement.prototype.hidePopover === "function"
  );
}

/** Keep native top-layer behavior where available; older browsers use a portal. */
export function PopupPortal({
  anchor,
  children,
}: {
  anchor: RefObject<HTMLElement>;
  children: ReactNode;
}) {
  if (hasPopover() || !anchor.current) return <>{children}</>;
  const target = anchor.current.closest("dialog[open]") ?? document.body;
  const computed = getComputedStyle(anchor.current);
  const style: CSSProperties & Record<string, string> = { display: "contents" };
  for (let i = 0; i < computed.length; i++) {
    const name = computed[i];
    if (name.startsWith("--ep-")) style[name] = computed.getPropertyValue(name);
  }
  return createPortal(
    <div className="ep-ui ep-popup-portal" style={style}>
      {children}
    </div>,
    target,
  );
}

export function showPopup(el: HTMLElement): () => void {
  if (hasPopover()) {
    el.setAttribute("popover", "manual");
    el.showPopover();
    return () => {
      if (el.isConnected && el.matches(":popover-open")) el.hidePopover();
    };
  }
  // Never set popover or query :popover-open on unsupported browsers.
  const dialog = el.closest("dialog");
  if (dialog) {
    const count = Number(dialog.dataset.epPopupCount || 0) + 1;
    dialog.dataset.epPopupCount = String(count);
    dialog.classList.add("ep-popup-fallback-active");
  }
  return () => {
    if (!dialog) return;
    const count = Number(dialog.dataset.epPopupCount || 1) - 1;
    if (count > 0) dialog.dataset.epPopupCount = String(count);
    else {
      delete dialog.dataset.epPopupCount;
      dialog.classList.remove("ep-popup-fallback-active");
    }
  };
}
