import { getSession } from "@/lib/session";
import { listPerformance, CYCLE, GOAL_CYCLE } from "@/repos/perf";
import { ReviewButton } from "./review-drawer";
import { MyGoals, GoalDecision } from "./goals";

export const dynamic = "force-dynamic";

const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
const stagePill = (s: string) => <span className={"pill " + (s === "Closed" ? "green" : s === "Self-review" ? "" : "amber")}>{s}</span>;
const goalPill = (s: string) => <span className={"pill " + (s === "Done" ? "green" : s === "At risk" ? "red" : "")}>{s}</span>;
const stars = (n: number | null) => (n ? <span style={{ color: "#e0a912" }}>{"★".repeat(n)}</span> : <span style={{ color: "var(--muted)" }}>—</span>);

export default async function PerformPage() {
  const session = await getSession();
  const { rows, goals, stats, role, selfId } = await listPerformance(session);
  const isEmployee = session.role === "employee";
  const me = rows.find((r) => r.worker_id === selfId);
  const myGoals = goals.filter((g) => g.worker_id === selfId);

  return (
    <main>
      <div className="top">
        <div>
          <h1>Talent &amp; Performance</h1>
          <div className="sub">{CYCLE} · viewing as <strong>{session.role}</strong></div>
        </div>
      </div>

      {isEmployee ? (
        me ? (
          <>
            <div className="statrow">
              <div className="stat"><div className="lbl">Where it is</div><div className="val" style={{ fontSize: 18, marginTop: 16 }}>{stagePill(me.stage)}</div></div>
              <div className="stat"><div className="lbl">My rating</div><div className="val" style={{ fontSize: 22, marginTop: 12 }}>{stars(me.rating)}</div><div className="sub2">{me.rating ? "from your manager" : "pending"}</div></div>
              <div className="stat" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="lbl" style={{ marginBottom: 10 }}>My review</div>
                <ReviewButton review={me} role={role} selfId={selfId} />
              </div>
            </div>
            <div className="panel">
              <div className="panel-hd"><span>My goals</span><span className="badge">Performance year · {GOAL_CYCLE}</span></div>
              <MyGoals goals={myGoals} />
            </div>
          </>
        ) : <div className="empty-cta"><h2>No review on file</h2><p>Your performance review for this cycle isn't set up yet.</p></div>
      ) : (
        <>
          <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="stat"><div className="lbl">Reviews closed</div><div className="val">{stats.completionPct}%</div><div className="sub2">{stats.closed}/{stats.total}</div></div>
            <div className="stat"><div className="lbl">Avg rating</div><div className="val">{stats.avgRating || "—"}</div><div className="sub2">out of 5</div></div>
            <div className="stat"><div className="lbl">Awaiting manager</div><div className="val">{stats.awaitingMgr}</div><div className="sub2">need review</div></div>
            <div className="stat"><div className="lbl">Awaiting HR</div><div className="val">{stats.awaitingHr}</div><div className="sub2">to acknowledge</div></div>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-hd">Review status <span className="badge">{stats.awaitingSelf} awaiting self-review</span></div>
            <table>
              <thead><tr><th>Employee</th><th>Stage</th><th>Rating</th><th>Goals</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.worker_id}>
                    <td><span className="av">{initials(r.name)}</span>{r.name}</td>
                    <td>{stagePill(r.stage)}</td>
                    <td>{stars(r.rating)}</td>
                    <td>{r.goals}</td>
                    <td style={{ textAlign: "right" }}><ReviewButton review={r} role={role} selfId={selfId} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-hd">
              <span>Goals — team{goals.some((g) => g.stage === "Submitted") && <span className="badge">{goals.filter((g) => g.stage === "Submitted").length} to evaluate</span>}</span>
              <span className="badge">Performance year · {GOAL_CYCLE}</span>
            </div>
            <div style={{ padding: 22, maxHeight: 420, overflow: "auto" }}>
              {goals.length === 0 ? <div style={{ color: "var(--muted)" }}>No goals yet.</div> : goals.map((g) => (
                <div key={g.id} style={{ marginBottom: 16, borderTop: "1px solid #f0f0f3", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, alignItems: "center" }}>
                    <span><span style={{ fontWeight: 600 }}>{g.title}</span> <span style={{ color: "var(--muted)" }}>· {g.owner}</span></span>
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <span className={"pill " + (g.stage === "Approved" ? "green" : g.stage === "Rejected" ? "red" : g.stage === "Submitted" ? "amber" : "")}>{g.stage}</span>
                      {goalPill(g.status)}
                    </span>
                  </div>
                  <div className="rangebar"><div className="rangefill" style={{ width: g.progress + "%", background: g.status === "At risk" ? "var(--red)" : g.status === "Done" ? "var(--green)" : undefined }} /></div>
                  {g.stage === "Submitted" && <div style={{ marginTop: 8 }}><GoalDecision goalId={g.id} /></div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
