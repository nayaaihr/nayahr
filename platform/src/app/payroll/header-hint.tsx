"use client";

import { useRef, useState } from "react";

/** A column-header label that shows a styled tooltip on hover. Uses fixed
 *  positioning so the scrollable panel's overflow can't clip it — and doesn't
 *  rely on the browser's (flaky) native `title` tooltip. */
export function HeaderHint({ label, tip }: { label: string; tip: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 7, left: Math.min(r.left, window.innerWidth - 280) });
  };

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onFocus={show}
      onMouseLeave={() => setPos(null)}
      onBlur={() => setPos(null)}
      tabIndex={0}
      style={{ cursor: "help", borderBottom: "1px dotted var(--muted)" }}
    >
      {label}
      {pos && (
        <span
          role="tooltip"
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 70, width: 250,
            background: "#1d1d1f", color: "#fff", fontSize: 12, fontWeight: 400, lineHeight: 1.45,
            textTransform: "none", letterSpacing: 0, textAlign: "left", padding: "9px 11px",
            borderRadius: 8, boxShadow: "0 10px 28px rgba(0,0,0,.24)", pointerEvents: "none", whiteSpace: "normal",
          }}
        >
          {tip}
        </span>
      )}
    </span>
  );
}
