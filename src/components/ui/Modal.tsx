"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Shared accessible dialog: autofocus, focus containment, Escape and focus restoration. */
export default function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      (ref.current?.querySelector("[data-autofocus]") as HTMLElement | null)?.focus();
      if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key !== "Tab") return;
      const els = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(el => el.offsetParent !== null);
      const first = els[0], last = els[els.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", onKey); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(<div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`modal-panel ${wide ? "modal-wide" : ""}`}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19}/></button></div>{children}</div></div>, document.body);
}
