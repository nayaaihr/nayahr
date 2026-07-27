"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { grantAdminAction, revokeAdminAction, transferOwnershipAction } from "./actions";
import type { MemberOpt } from "@/repos/admins";

/** Per-row actions for an existing HR Admin: revoke access, or hand them ownership. */
export function AdminRowActions({ appUserId, name }: { appUserId: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const revoke = () => {
    if (!confirm(`Remove HR Admin access from ${name}? They'll become a regular member.`)) return;
    start(async () => {
      const r = await revokeAdminAction(appUserId);
      if (r.ok) router.refresh(); else alert(r.error);
    });
  };
  const transfer = () => {
    if (!confirm(`Transfer ownership to ${name}?\n\nThey become the account Owner and you step down to HR Admin. This can only be undone by the new owner.`)) return;
    start(async () => {
      const r = await transferOwnershipAction(appUserId);
      if (r.ok) router.refresh(); else alert(r.error);
    });
  };

  return (
    <span style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
      <button className="btn ghost sm" disabled={pending} onClick={transfer}>Make owner</button>
      <button className="btn ghost sm" disabled={pending} onClick={revoke}>Revoke admin</button>
    </span>
  );
}

/** Grant HR Admin to an existing member picked from a dropdown. */
export function GrantAdmin({ options }: { options: MemberOpt[] }) {
  const [sel, setSel] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const grant = () => {
    if (!sel) return;
    start(async () => {
      const r = await grantAdminAction(sel);
      if (r.ok) { setSel(""); router.refresh(); } else alert(r.error);
    });
  };

  if (options.length === 0) {
    return <span className="sub" style={{ color: "var(--muted)", fontSize: 13 }}>No other members yet — invite employees from People first.</span>;
  }
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        disabled={pending}
        style={{ minWidth: 240, font: "inherit", fontSize: 13, padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10, background: "#fff", color: "var(--ink)" }}
      >
        <option value="">Select a member…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <button className="btn sm" disabled={pending || !sel} onClick={grant}>Make HR Admin</button>
    </span>
  );
}
