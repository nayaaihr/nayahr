"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGoalAction, updateGoalAction, submitGoalAction, decideGoalAction, type R } from "./actions";
import type { PerfGoal } from "@/repos/perf";

function useGo() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (fn: () => Promise<R>) => start(async () => {
    const res = await fn();
    if (res.ok) router.refresh(); else alert(res.error);
  });
  return { pending, go };
}

const stagePill = (s: string) => <span className={"pill " + (s === "Approved" ? "green" : s === "Rejected" ? "red" : s === "Submitted" ? "amber" : "")}>{s}</span>;
const statusPill = (s: string) => <span className={"pill " + (s === "Done" ? "green" : s === "At risk" ? "red" : "")}>{s}</span>;

export function MyGoals({ goals }: { goals: PerfGoal[] }) {
  const { pending, go } = useGo();
  const [title, setTitle] = useState("");
  return (
    <div style={{ padding: 22 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New goal for this performance year…" style={{ flex: 1 }} />
        <button className="btn" disabled={pending || !title.trim()} onClick={() => go(async () => { const r = await createGoalAction(title); if (r.ok) setTitle(""); return r; })}>+ Add goal</button>
      </div>
      {goals.length === 0 ? (
        <div style={{ color: "var(--muted)", marginTop: 14 }}>No goals yet — add your first above, then submit it for your manager to approve.</div>
      ) : goals.map((g) => (
        <div key={g.id} style={{ marginTop: 16, borderTop: "1px solid #f0f0f3", paddingTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{g.title}</span>
            <span style={{ display: "inline-flex", gap: 6 }}>{stagePill(g.stage)}{statusPill(g.status)}</span>
          </div>
          <div className="rangebar"><div className="rangefill" style={{ width: g.progress + "%", background: g.status === "At risk" ? "var(--red)" : g.status === "Done" ? "var(--green)" : undefined }} /></div>
          {g.stage === "Rejected" && g.manager_comment && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 6 }}>Sent back: {g.manager_comment}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            {(g.stage === "Draft" || g.stage === "Rejected") && <button className="btn sm" disabled={pending} onClick={() => go(() => submitGoalAction(g.id))}>Submit for approval</button>}
            {g.stage === "Submitted" && <span style={{ fontSize: 12, color: "var(--muted)" }}>Awaiting manager evaluation…</span>}
            {g.stage === "Approved" && <ProgressEditor goalId={g.id} progress={g.progress} status={g.status} go={go} pending={pending} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressEditor({ goalId, progress, status, go, pending }: { goalId: string; progress: number; status: string; go: (fn: () => Promise<R>) => void; pending: boolean }) {
  const [p, setP] = useState(progress);
  const [st, setSt] = useState(status);
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 12 }}>
      <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>Progress <input type="number" min={0} max={100} value={p} onChange={(e) => setP(Number(e.target.value))} style={{ width: 62 }} />%</label>
      <select value={st} onChange={(e) => setSt(e.target.value)} style={{ width: 110 }}><option>On track</option><option>At risk</option><option>Done</option></select>
      <button className="btn ghost sm" disabled={pending} onClick={() => go(() => updateGoalAction(goalId, p, st))}>Save</button>
    </span>
  );
}

export function GoalDecision({ goalId }: { goalId: string }) {
  const { pending, go } = useGo();
  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn sm" disabled={pending} onClick={() => go(() => decideGoalAction(goalId, true, ""))}>Approve</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => { const c = window.prompt("Reason for sending back (optional):") ?? ""; go(() => decideGoalAction(goalId, false, c)); }}>Send back</button>
    </span>
  );
}
