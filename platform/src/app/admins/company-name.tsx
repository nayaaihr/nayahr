"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyNameAction } from "./company-actions";

/** Inline editor for the company (tenant) name — shows on branding + payslips. */
export function CompanyName({ current }: { current: string }) {
  const [name, setName] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = name.trim() !== current && name.trim().length >= 2;

  const save = () => start(async () => {
    const r = await setCompanyNameAction(name);
    if (r.ok) router.refresh(); else alert(r.error);
  });

  return (
    <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 10, maxWidth: 460 }}>
      <label style={{ fontSize: 13, fontWeight: 600 }}>Company name</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="e.g. Acme Technologies Pvt Ltd"
          onKeyDown={(e) => { if (e.key === "Enter" && dirty) save(); }}
          style={{ flex: 1, font: "inherit", fontSize: 14, padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10, background: "#fff", color: "var(--ink)" }}
        />
        <button className="btn" disabled={!dirty || pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
      </div>
      <div className="sub" style={{ fontSize: 12.5, color: "var(--muted)" }}>
        This is the legal name shown in the sidebar and on employee payslips.
      </div>
    </div>
  );
}
