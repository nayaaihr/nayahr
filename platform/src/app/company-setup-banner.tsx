"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyNameAction } from "./admins/company-actions";

/** First-login prompt for a new client owner/HR to set (or confirm) their real
 *  company name, replacing the value auto-guessed from their email domain.
 *  Disappears once saved (setCompanyName marks the tenant name as confirmed). */
export function CompanySetupBanner({ current }: { current: string }) {
  const [name, setName] = useState(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) { alert("Please enter your company name."); return; }
    start(async () => {
      const r = await setCompanyNameAction(clean);
      if (r.ok) router.refresh(); else alert(r.error);
    });
  }

  return (
    <div style={{ margin: "0 0 22px", padding: "18px 20px", background: "var(--brand-soft)", border: "1px solid var(--line-2, #e6e6ea)", borderRadius: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--brand-deep, #0059b8)", marginBottom: 3 }}>Welcome to NayaHR 👋</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 12 }}>
        Set your company name — it appears across your workspace, payslips, and careers page. You can change it anytime under <strong>Manage admins</strong>.
      </div>
      <form onSubmit={save} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your company name"
          autoFocus
          maxLength={80}
          style={{ flex: "1 1 260px", minWidth: 0, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 14 }}
        />
        <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : "Save company name"}</button>
      </form>
    </div>
  );
}
