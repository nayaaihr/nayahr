"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDevRole } from "./dev-role-action";

const ROLES = [
  { v: "owner", label: "Owner" },
  { v: "hr_admin", label: "HR Admin" },
  { v: "manager", label: "Manager" },
  { v: "employee", label: "Employee" },
];

export function DevSwitcher({ current, personaName }: { current: string; personaName?: string | null }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="devsw">
      <span className="devsw-lbl">View as {pending && "…"}</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => start(async () => { await setDevRole(e.target.value); router.refresh(); })}
      >
        {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
      </select>
      {personaName && (current === "manager" || current === "employee") && (
        <div className="devsw-persona">as <strong>{personaName}</strong></div>
      )}
    </div>
  );
}
