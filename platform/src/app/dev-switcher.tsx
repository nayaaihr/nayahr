"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDevRole } from "./dev-role-action";

const ROLES = [
  { v: "owner", label: "Owner" },
  { v: "hr_admin", label: "HR Admin" },
  { v: "manager", label: "Manager (Dhruv)" },
  { v: "employee", label: "Employee (Pooja)" },
];

export function DevSwitcher({ current }: { current: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="devsw">
      <span className="devsw-lbl">Dev role {pending && "…"}</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => start(async () => { await setDevRole(e.target.value); router.refresh(); })}
      >
        {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
      </select>
    </div>
  );
}
