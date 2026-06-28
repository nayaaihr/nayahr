import type { Session } from "@/db/client";
import { listPeople, type PersonRow } from "@/repos/people";
import { listComp } from "@/repos/comp";
import { listRecruitment } from "@/repos/recruit";
import { listPerformance } from "@/repos/perf";

export type Slice = { name: string; n: number };
export type Report = {
  scope: "org" | "team";
  headcount: { active: number; total: number; terminated: number; joiners90: number; byDept: Slice[]; byLocation: Slice[] };
  comp: { payroll: number; avg: number; median: number; below: number; above: number };
  recruiting: { openReqs: number; pipeline: number; offers: number; hired: number };
  performance: { closedPct: number; avgRating: number; goalsOnTrack: number; goalsAtRisk: number; awaiting: number };
};

const within90 = (d: string) => {
  const t = Date.parse(d);
  return !Number.isNaN(t) && (Date.now() - t) / 86_400_000 <= 90;
};
function group(rows: PersonRow[], key: (p: PersonRow) => string | null): Slice[] {
  const m = new Map<string, number>();
  rows.forEach((p) => { const k = key(p) || "Unassigned"; m.set(k, (m.get(k) ?? 0) + 1); });
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
}

/** Cross-module analytics for the people the viewer can see (org for admin/owner,
 *  team for a manager). Reuses each module's repo so scoping/RLS stay consistent. */
export async function buildReport(s: Session): Promise<Report> {
  const [people, comp, recruit, perf] = await Promise.all([
    listPeople(s), listComp(s), listRecruitment(s), listPerformance(s),
  ]);
  const active = people.filter((p) => p.employment_status === "Active");

  return {
    scope: s.role === "manager" ? "team" : "org",
    headcount: {
      active: active.length,
      total: people.length,
      terminated: people.filter((p) => p.employment_status !== "Active").length,
      joiners90: people.filter((p) => within90(p.hired_on)).length,
      byDept: group(active, (p) => p.department),
      byLocation: group(active, (p) => p.location),
    },
    comp: { payroll: comp.stats.payroll, avg: comp.stats.avg, median: comp.stats.median, below: comp.stats.below, above: comp.stats.above },
    recruiting: {
      openReqs: recruit.reqs.filter((r) => r.status === "Open").length,
      pipeline: recruit.cands.filter((c) => c.stage !== "Hired" && c.stage !== "Rejected").length,
      offers: recruit.cands.filter((c) => c.stage === "Offer").length,
      hired: recruit.cands.filter((c) => c.stage === "Hired").length,
    },
    performance: {
      closedPct: perf.stats.completionPct, avgRating: perf.stats.avgRating,
      goalsOnTrack: perf.stats.goalsOnTrack, goalsAtRisk: perf.stats.goalsAtRisk,
      awaiting: perf.stats.awaitingMgr + perf.stats.awaitingHr + perf.stats.awaitingSelf,
    },
  };
}
