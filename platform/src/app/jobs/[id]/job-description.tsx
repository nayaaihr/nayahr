"use client";

import { useState } from "react";

/** Public job description: capped to a preview with a Read more / Read less
 *  toggle so a very long JD doesn't bury the Apply CTA under a wall of text.
 *  Keeps the .job-desc styling (incl. white-space: pre-wrap for line breaks). */
export function JobDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 400;
  const clamp = !open && long
    ? { display: "-webkit-box", WebkitLineClamp: 10, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }
    : {};
  return (
    <div style={{ marginBottom: 26 }}>
      <p className="job-desc" style={{ marginBottom: 0, ...clamp }}>{text}</p>
      {long && (
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ background: "none", border: 0, padding: 0, marginTop: 12, cursor: "pointer", color: "var(--brand)", fontSize: 14, fontWeight: 600 }}
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}
