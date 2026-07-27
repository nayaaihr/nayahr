"use client";

import { useEffect, useRef, useState } from "react";

/** Reusable per-row "⋯" actions menu. Renders a kebab button + a fixed-positioned
 *  popover (so a scrollable/overflow-hidden panel can't clip it). Closes on
 *  outside-click, Esc, scroll or resize. Menu items are supplied as a render
 *  function that receives a `close` callback. */
export function RowMenu({
  children,
  width = 210,
  title = "Actions",
  disabled = false,
}: {
  children: (close: () => void) => React.ReactNode;
  width?: number;
  title?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  const toggle = () => {
    if (open) return close();
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: Math.max(8, r.right - width) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) close();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onMove = () => close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} className="rowmenu-btn" disabled={disabled} aria-haspopup="menu" aria-expanded={open} title={title} onClick={toggle}>
        ⋯
      </button>
      {open && (
        <div ref={popRef} className="rowmenu-pop" role="menu" style={{ top: pos.top, left: pos.left, width }}>
          {children(close)}
        </div>
      )}
    </>
  );
}
