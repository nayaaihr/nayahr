"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDevRole, setViewAsWorker } from "./dev-role-action";

const ROLES = [
  { v: "owner", label: "Owner" },
  { v: "hr_admin", label: "HR Admin" },
  { v: "manager", label: "Manager" },
  { v: "employee", label: "Employee" },
];
type Opt = { id: string; name: string };

export function DevSwitcher({ current, currentWorkerId, managers, employees }: {
  current: string; currentWorkerId?: string | null; managers?: Opt[]; employees?: Opt[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const personaOpts = current === "manager" ? (managers ?? []) : current === "employee" ? (employees ?? []) : [];

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
      {personaOpts.length > 0 && (
        <select
          className="devsw-persona-sel"
          value={currentWorkerId ?? ""}
          disabled={pending}
          onChange={(e) => start(async () => { await setViewAsWorker(e.target.value); router.refresh(); })}
        >
          {personaOpts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}
    </div>
  );
}
