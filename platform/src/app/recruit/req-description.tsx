"use client";

import { useState } from "react";

/** Requisition description: clamped to two lines with an expand/collapse toggle
 *  so long descriptions don't make the table row tall and busy. */
export function ReqDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 120;
  const base = { fontWeight: 400, fontSize: 11.5, color: "var(--muted)", whiteSpace: "normal" as const, lineHeight: 1.4 };
  const clamp = !open && long
    ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }
    : {};
  return (
    <div style={{ marginTop: 3, maxWidth: 340 }}>
      <div style={{ ...base, ...clamp }}>{text}</div>
      {long && (
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ background: "none", border: 0, padding: 0, marginTop: 2, cursor: "pointer", color: "var(--brand)", fontSize: 11, fontWeight: 600 }}
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
