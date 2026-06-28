import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";
import { listLeave } from "@/repos/leave";
import { listRecruitment } from "@/repos/recruit";
import { listCompChanges } from "@/repos/comp";
import { listPerformance } from "@/repos/perf";
import { rupee } from "@/lib/salary";

export type InboxItem = {
  kind: "leave" | "requisition" | "comp" | "review";
  id: string;                                       // entity id the action operates on
  action: "approve_reject" | "acknowledge" | "link"; // inline controls to render
  title: string;
  subtitle: string;
  href: string;
};

/** Everything the signed-in persona is currently expected to act on, across
 *  modules. Each underlying repo is role-scoped, so this respects RBAC/RLS. */
export async function inboxItems(s: Session): Promise<InboxItem[]> {
  const items: InboxItem[] = [];
  const isApprover = s.role === "owner" || s.role === "hr_admin";

  // Leave approvals (manager → team, HR/owner → org)
  if (s.role !== "employee") {
    const leave = await listLeave(s);
    leave.filter((l) => l.status === "Pending").forEach((l) =>
      items.push({ kind: "leave", id: l.id, action: "approve_reject", title: `Leave approval — ${l.employee}`, subtitle: `${l.type} · ${l.days} day(s) from ${String(l.from_date).slice(0, 10)}`, href: "/leave" }));
  }

  // Requisition + pay-change approvals (HR/owner)
  if (isApprover) {
    const { reqs } = await listRecruitment(s);
    reqs.filter((r) => r.status === "Pending approval").forEach((r) =>
      items.push({ kind: "requisition", id: r.id, action: "approve_reject", title: `Requisition approval — ${r.title}`, subtitle: [r.department, r.location].filter(Boolean).join(" · ") || "New role", href: "/recruit" }));
    const cc = await listCompChanges(s);
    cc.filter((c) => c.status === "Pending").forEach((c) =>
      items.push({ kind: "comp", id: c.id, action: "approve_reject", title: `Pay change — ${c.employee}`, subtitle: `→ ${rupee(c.new_amount)} effective ${c.effective_date}`, href: "/comp" }));
  }

  // Performance reviews
  const perf = await listPerformance(s);
  if (s.workerId) {
    const me = perf.rows.find((r) => r.worker_id === s.workerId);
    if (me && me.stage === "Self-review") items.push({ kind: "review", id: me.worker_id, action: "link", title: "Your self-review is due", subtitle: "Performance review — submit to your manager", href: "/perform" });
  }
  if (s.role === "manager") {
    perf.rows.filter((r) => r.stage === "Manager review" && r.worker_id !== s.workerId).forEach((r) =>
      items.push({ kind: "review", id: r.worker_id, action: "link", title: `Review — ${r.name}`, subtitle: "Manager review due (rate & approve)", href: "/perform" }));
  }
  if (isApprover) {
    perf.rows.filter((r) => r.stage === "HR review").forEach((r) =>
      items.push({ kind: "review", id: r.worker_id, action: "acknowledge", title: `Review — ${r.name}`, subtitle: "HR acknowledgement due", href: "/perform" }));
  }

  return items;
}

/** Lightweight count for the nav badge — runs on every page load, so it uses
 *  direct COUNT queries in a single transaction rather than the full repos.
 *  Must stay in sync with the categories in `inboxItems`. */
export async function inboxCount(s: Session): Promise<number> {
  try {
    return await withSession(s, async (tx) => {
      let total = 0;

      // Own self-review due (any persona linked to a worker).
      if (s.workerId) {
        const r = (await tx.execute(sql`select count(*)::int n from review where worker_id = ${s.workerId} and stage = 'Self-review'`)).rows as Array<{ n: number }>;
        total += r[0]?.n ?? 0;
      }

      if (s.role === "owner" || s.role === "hr_admin") {
        // Org-scoped (RLS limits to the tenant): pending approvals + HR reviews.
        const r = (await tx.execute(sql`select (
            (select count(*) from leave_request where status = 'Pending') +
            (select count(*) from requisition where status = 'Pending approval') +
            (select count(*) from comp_change_request where status = 'Pending') +
            (select count(*) from review where stage = 'HR review')
          )::int n`)).rows as Array<{ n: number }>;
        total += r[0]?.n ?? 0;
      } else if (s.role === "manager" && s.workerId) {
        // Team-scoped (latest job_event manager_id = me): team leave + manager reviews due.
        const r = (await tx.execute(sql`
          with latest as (
            select distinct on (w.id) w.id as worker_id, j.manager_id
            from worker w
            join job_event j on j.worker_id = w.id and j.effective_date <= current_date
            order by w.id, j.effective_date desc, j.seq desc
          ), team as (select worker_id from latest where manager_id = ${s.workerId})
          select (
            (select count(*) from leave_request where status = 'Pending' and worker_id in (select worker_id from team)) +
            (select count(*) from review where stage = 'Manager review' and worker_id in (select worker_id from team) and worker_id <> ${s.workerId})
          )::int n`)).rows as Array<{ n: number }>;
        total += r[0]?.n ?? 0;
      }

      return total;
    });
  } catch { return 0; }
}
