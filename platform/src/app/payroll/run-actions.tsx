"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { finalizeRunAction, deleteRunAction, reopenRunAction, regenerateRunAction } from "./actions";

/** Draft: finalize / regenerate / delete. Finalized: reopen to correct (NH-106). */
export function RunActions({ runId, status }: { runId: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const finalize = () => {
    if (!confirm("Finalize this payroll?\n\nPayslips lock and become visible to employees on their profile.")) return;
    start(async () => { const r = await finalizeRunAction(runId); if (r.ok) router.refresh(); else alert(r.error); });
  };
  const regenerate = () => {
    if (!confirm("Recalculate every payslip from the current salary, leave and joining dates?\n\nThis replaces the draft's payslips — use it after correcting employee data.")) return;
    start(async () => { const r = await regenerateRunAction(runId); if (r.ok) router.refresh(); else alert(r.error); });
  };
  const del = () => {
    if (!confirm("Delete this draft payroll and its payslips? This can't be undone.")) return;
    start(async () => { const r = await deleteRunAction(runId); if (r.ok) router.push("/payroll"); else alert(r.error); });
  };
  const reopen = () => {
    if (!confirm("Reopen this finalized payroll to Draft?\n\nEmployees stop seeing these payslips until you finalize again. Correct the data (or Regenerate), then re-finalize.")) return;
    start(async () => { const r = await reopenRunAction(runId); if (r.ok) router.refresh(); else alert(r.error); });
  };

  if (status === "Draft") return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn" disabled={pending} onClick={finalize}>Finalize payroll</button>
      <button className="btn ghost" disabled={pending} onClick={regenerate}>Regenerate</button>
      <button className="btn ghost" disabled={pending} onClick={del} style={{ color: "var(--red)" }}>Delete draft</button>
    </span>
  );

  if (status === "Finalized") return (
    <button className="btn ghost" disabled={pending} onClick={reopen}>Reopen to correct</button>
  );

  return null;
}
