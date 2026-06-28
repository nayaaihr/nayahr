import { getSession } from "@/lib/session";
import { listLeave, balancesFor, LEAVE_TYPES } from "@/repos/leave";
import { RequestLeave } from "./request-leave";
import { DecideButtons } from "./decide-buttons";

export const dynamic = "force-dynamic";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function statusPill(s: string) {
  const cls = s === "Approved" ? "green" : s === "Rejected" ? "red" : "amber";
  return <span className={"pill " + cls}>{s}</span>;
}

export default async function LeavePage() {
  const session = await getSession();
  const leave = await listLeave(session);
  const canRequest = !!session.workerId;
  const canDecide = session.role !== "employee";
  const balances = balancesFor(leave, session.workerId);
  const pending = leave.filter((l) => l.status === "Pending").length;

  return (
    <main>
      <div className="top">
        <div>
          <h1>Time &amp; Leave</h1>
          <div className="sub">
            {canDecide ? "Team requests + approvals" : "Your time off"} · viewing as{" "}
            <strong>{session.role}</strong>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {canRequest && <RequestLeave types={LEAVE_TYPES.map((t) => ({ name: t.name, note: t.note }))} />}
        </div>
      </div>

      {canRequest && (
        <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {balances.map((b) => (
            <div className="stat" key={b.type}>
              <div className="lbl">{b.type}</div>
              <div className="val">{b.remaining}</div>
              <div className="sub2">{b.used} used · of {b.allowance}</div>
            </div>
          ))}
          <div className="stat"><div className="lbl">Pending</div><div className="val">{leave.filter((l) => l.worker_id === session.workerId && l.status === "Pending").length}</div><div className="sub2">awaiting approval</div></div>
        </div>
      )}

      <div className="panel">
        <div className="panel-hd">
          {canDecide ? "Leave requests" : "My requests"}
          {canDecide && pending > 0 && <span className="badge">{pending} pending</span>}
        </div>
        <table>
          <thead>
            <tr>
              {canDecide && <th>Employee</th>}
              <th>Type</th><th>From</th><th>Days</th><th>Status</th>
              {canDecide && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {leave.length === 0 ? (
              <tr><td colSpan={canDecide ? 6 : 4} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No leave requests yet.</td></tr>
            ) : (
              leave.map((l) => (
                <tr key={l.id}>
                  {canDecide && <td>{l.employee}</td>}
                  <td>{l.type}</td>
                  <td>{fmt(l.from_date)}</td>
                  <td>{l.days}</td>
                  <td>{statusPill(l.status)}</td>
                  {canDecide && <td>{l.status === "Pending" ? <DecideButtons id={l.id} /> : "—"}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
