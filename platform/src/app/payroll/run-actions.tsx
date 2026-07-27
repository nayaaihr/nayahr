"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { finalizeRunAction, deleteRunAction } from "./actions";

/** Finalize / delete controls for a draft payroll run. */
export function RunActions({ runId, status }: { runId: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (status !== "Draft") return null;

  const finalize = () => {
    if (!confirm("Finalize this payroll?\n\nPayslips lock and become visible to employees on their profile.")) return;
    start(async () => { const r = await finalizeRunAction(runId); if (r.ok) router.refresh(); else alert(r.error); });
  };
  const del = () => {
    if (!confirm("Delete this draft payroll and its payslips? This can't be undone.")) return;
    start(async () => { const r = await deleteRunAction(runId); if (r.ok) router.push("/payroll"); else alert(r.error); });
  };

  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn" disabled={pending} onClick={finalize}>Finalize payroll</button>
      <button className="btn ghost" disabled={pending} onClick={del} style={{ color: "var(--red)" }}>Delete draft</button>
    </span>
  );
}
