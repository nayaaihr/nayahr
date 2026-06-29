import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";
import { listPeople } from "@/repos/people";

export const CYCLE = "H1 2026 Performance Review";
export const GOAL_CYCLE = "FY 2026-27"; // performance year for goals (Indian financial year)
export const STAGES = ["Self-review", "Manager review", "HR review", "Closed"] as const;

export type Review = {
  worker_id: string; name: string; stage: string;
  self_status: string; mgr_status: string; hr_status: string; rating: number | null;
  self_text: string | null; manager_comment: string | null; hr_comment: string | null;
  goals: number;
};
export type PerfGoal = { id: string; worker_id: string; owner: string; title: string; progress: number; status: string; stage: string; cycle: string; manager_comment: string | null };
export type PerfStats = {
  total: number; closed: number; completionPct: number; avgRating: number;
  awaitingSelf: number; awaitingMgr: number; awaitingHr: number;
  goalsOnTrack: number; goalsAtRisk: number;
};

export async function listPerformance(s: Session): Promise<{ rows: Review[]; goals: PerfGoal[]; stats: PerfStats; canManage: boolean; role: string; selfId: string | null }> {
  const people = await listPeople(s);
  const active = people.filter((p) => p.employment_status === "Active");
  const ids = active.map((p) => p.worker_id);
  const nameById = new Map(active.map((p) => [p.worker_id, p.full_name]));
  const canManage = s.role === "owner" || s.role === "hr_admin" || s.role === "manager";
  const empty: PerfStats = { total: 0, closed: 0, completionPct: 0, avgRating: 0, awaitingSelf: 0, awaitingMgr: 0, awaitingHr: 0, goalsOnTrack: 0, goalsAtRisk: 0 };
  if (!ids.length) return { rows: [], goals: [], stats: empty, canManage, role: s.role, selfId: s.workerId ?? null };

  const inList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  return withSession(s, async (tx) => {
    const rv = (await tx.execute(sql`select worker_id, self_status, mgr_status, hr_status, rating, stage, self_text, manager_comment, hr_comment from review where worker_id::text in (${inList})`)).rows as Array<Record<string, unknown>>;
    const gl = (await tx.execute(sql`select id, worker_id, title, progress, status, stage, cycle, manager_comment from goal where worker_id::text in (${inList})`)).rows as Array<Record<string, unknown>>;
    const byWorker = new Map(rv.map((r) => [r.worker_id as string, r]));
    const goalsByWorker = new Map<string, number>();
    gl.forEach((g) => goalsByWorker.set(g.worker_id as string, (goalsByWorker.get(g.worker_id as string) ?? 0) + 1));

    const rows: Review[] = active.map((p) => {
      const r = byWorker.get(p.worker_id);
      return {
        worker_id: p.worker_id, name: p.full_name,
        stage: (r?.stage as string) ?? "Self-review",
        self_status: (r?.self_status as string) ?? "Not started",
        mgr_status: (r?.mgr_status as string) ?? "Not started",
        hr_status: (r?.hr_status as string) ?? "Pending",
        rating: (r?.rating as number) ?? null,
        self_text: (r?.self_text as string) ?? null,
        manager_comment: (r?.manager_comment as string) ?? null,
        hr_comment: (r?.hr_comment as string) ?? null,
        goals: goalsByWorker.get(p.worker_id) ?? 0,
      };
    });
    const goals: PerfGoal[] = gl.map((g) => ({
      id: g.id as string, worker_id: g.worker_id as string, owner: nameById.get(g.worker_id as string) ?? "—",
      title: g.title as string, progress: g.progress as number, status: g.status as string,
      stage: (g.stage as string) ?? "Draft", cycle: (g.cycle as string) ?? GOAL_CYCLE, manager_comment: (g.manager_comment as string) ?? null,
    })).sort((a, b) => b.progress - a.progress);

    const rated = rows.filter((r) => r.rating != null).map((r) => r.rating as number);
    const closed = rows.filter((r) => r.stage === "Closed").length;
    const stats: PerfStats = {
      total: rows.length, closed,
      completionPct: rows.length ? Math.round((closed / rows.length) * 100) : 0,
      avgRating: rated.length ? +(rated.reduce((s2, x) => s2 + x, 0) / rated.length).toFixed(1) : 0,
      awaitingSelf: rows.filter((r) => r.stage === "Self-review").length,
      awaitingMgr: rows.filter((r) => r.stage === "Manager review").length,
      awaitingHr: rows.filter((r) => r.stage === "HR review").length,
      goalsOnTrack: goals.filter((g) => g.status === "On track").length,
      goalsAtRisk: goals.filter((g) => g.status === "At risk").length,
    };
    return { rows, goals, stats, canManage, role: s.role, selfId: s.workerId ?? null };
  });
}

const audit = (tx: Parameters<Parameters<typeof withSession>[1]>[0], s: Session, action: string, workerId: string, after: unknown) =>
  tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, ${action}, 'review', ${workerId}, ${JSON.stringify(after)}::jsonb)`);

/** Step 1 — employee submits their self-assessment → routes to the manager. */
export async function submitSelfReview(s: Session, text: string): Promise<void> {
  if (!s.workerId) throw new Error("No employee profile to submit a review for.");
  if (!text.trim()) throw new Error("Please write your self-assessment before submitting.");
  const wid = s.workerId;
  await withSession(s, async (tx) => {
    await tx.execute(sql`insert into review (tenant_id, worker_id, self_status, self_text, stage)
        values (${s.tenantId}, ${wid}, 'Submitted', ${text.trim()}, 'Manager review')
      on conflict (tenant_id, worker_id) do update set
        self_status = 'Submitted', self_text = ${text.trim()},
        stage = case when review.stage = 'Self-review' then 'Manager review' else review.stage end,
        updated_at = now()`);
    await audit(tx, s, "review_self_submit", wid, { len: text.trim().length });
  });
}

/** Step 2 — manager comments, rates and approves → routes to HR. */
export async function managerReview(s: Session, workerId: string, comment: string, rating: number): Promise<void> {
  if (s.role === "employee") throw new Error("Not authorized.");
  if (workerId === s.workerId) throw new Error("You can't review your own performance.");
  if (!(rating >= 1 && rating <= 5)) throw new Error("Please pick a rating from 1 to 5.");
  if (s.role === "manager") {
    const team = new Set((await listPeople(s)).map((p) => p.worker_id));
    if (!team.has(workerId)) throw new Error("That employee isn't on your team.");
  }
  await withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select stage from review where worker_id = ${workerId} limit 1`)).rows as Array<{ stage: string }>;
    if (r[0] && r[0].stage === "Self-review") throw new Error("Waiting on the employee's self-review first.");
    await tx.execute(sql`insert into review (tenant_id, worker_id, mgr_status, manager_comment, rating, stage)
        values (${s.tenantId}, ${workerId}, 'Completed', ${comment.trim() || null}, ${rating}, 'HR review')
      on conflict (tenant_id, worker_id) do update set
        mgr_status = 'Completed', manager_comment = ${comment.trim() || null}, rating = ${rating},
        stage = case when review.stage in ('Self-review','Manager review') then 'HR review' else review.stage end,
        updated_at = now()`);
    await audit(tx, s, "review_manager_approve", workerId, { rating });
  });
}

// ── Goals lifecycle ─────────────────────────────────────────────────────────
const audited = (tx: Parameters<Parameters<typeof withSession>[1]>[0], s: Session, action: string, id: string, after: unknown) =>
  tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, ${action}, 'goal', ${id}, ${JSON.stringify(after)}::jsonb)`);

/** Employee creates a goal for the performance year (starts as Draft). */
export async function createGoal(s: Session, title: string): Promise<void> {
  if (!s.workerId) throw new Error("Only an employee with a profile can set goals.");
  if (!title.trim()) throw new Error("Goal title is required.");
  const wid = s.workerId;
  await withSession(s, async (tx) => {
    const r = (await tx.execute(sql`insert into goal (tenant_id, worker_id, title, progress, status, cycle, stage)
      values (${s.tenantId}, ${wid}, ${title.trim()}, 0, 'On track', ${GOAL_CYCLE}, 'Draft') returning id`)).rows as Array<{ id: string }>;
    await audited(tx, s, "goal_create", r[0].id, { title: title.trim() });
  });
}

/** Employee updates progress / status on their own goal. */
export async function updateGoal(s: Session, goalId: string, progress: number, status: string): Promise<void> {
  if (!s.workerId) throw new Error("Not authorized.");
  await withSession(s, async (tx) => {
    const res = await tx.execute(sql`update goal set progress = ${Math.max(0, Math.min(100, progress))}, status = ${status}
      where id = ${goalId} and worker_id = ${s.workerId}`);
    if (res.rowCount === 0) throw new Error("That isn't your goal.");
  });
}

/** Employee submits a Draft/Rejected goal for manager evaluation. */
export async function submitGoal(s: Session, goalId: string): Promise<void> {
  if (!s.workerId) throw new Error("Not authorized.");
  await withSession(s, async (tx) => {
    const res = await tx.execute(sql`update goal set stage = 'Submitted', manager_comment = null
      where id = ${goalId} and worker_id = ${s.workerId} and stage in ('Draft', 'Rejected')`);
    if (res.rowCount === 0) throw new Error("This goal can't be submitted.");
    await audited(tx, s, "goal_submit", goalId, {});
  });
}

/** Manager (their team) or HR/Owner evaluates a submitted goal → Approved/Rejected. */
export async function decideGoal(s: Session, goalId: string, approve: boolean, comment: string): Promise<void> {
  if (s.role === "employee") throw new Error("Not authorized.");
  await withSession(s, async (tx) => {
    const g = (await tx.execute(sql`select worker_id from goal where id = ${goalId} and stage = 'Submitted' limit 1`)).rows as Array<{ worker_id: string }>;
    if (!g[0]) throw new Error("This goal isn't awaiting evaluation.");
    if (s.role === "manager") {
      const team = new Set((await listPeople(s)).map((p) => p.worker_id));
      if (!team.has(g[0].worker_id)) throw new Error("That goal isn't from your team.");
    }
    await tx.execute(sql`update goal set stage = ${approve ? "Approved" : "Rejected"}, manager_comment = ${comment.trim() || null} where id = ${goalId}`);
    await audited(tx, s, approve ? "goal_approve" : "goal_reject", goalId, { comment: comment.trim().slice(0, 120) });
  });
}

/** Step 3 — HR reviews and acknowledges → closes the review. */
export async function hrAcknowledge(s: Session, workerId: string, comment: string): Promise<void> {
  if (!(s.role === "owner" || s.role === "hr_admin")) throw new Error("Only HR can acknowledge a review.");
  await withSession(s, async (tx) => {
    const res = await tx.execute(sql`update review set hr_status = 'Acknowledged', hr_comment = ${comment.trim() || null}, stage = 'Closed', updated_at = now() where worker_id = ${workerId} and stage = 'HR review'`);
    if (res.rowCount === 0) throw new Error("This review isn't ready for HR yet.");
    await audit(tx, s, "review_hr_ack", workerId, { note: comment.trim().slice(0, 80) });
  });
}
