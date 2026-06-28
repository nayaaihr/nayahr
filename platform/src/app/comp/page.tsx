import { getSession } from "@/lib/session";
import { listComp, listCompChanges, listCompHistory, type CompRow } from "@/repos/comp";
import { RequestCompChange, CompDecision } from "./comp-actions";
import { SalaryStructure, CompHistory, CompDetailButton } from "./comp-detail";

export const dynamic = "force-dynamic";

const inr = (n: number) => "₹" + (n / 100000).toFixed(1) + "L";
const rupee = (n: number | null) => (n == null ? "—" : "₹" + n.toLocaleString("en-IN"));
function reqPill(s: string) {
  const c = s === "Approved" ? "green" : s === "Pending" ? "amber" : "red";
  return <span className={"pill " + c}>{s}</span>;
}
const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
function statusPill(s: string) {
  const c = s === "In range" ? "green" : s === "Below" ? "amber" : "red";
  return <span className={"pill " + c}>{s}</span>;
}
function rangeCell(r: CompRow) {
  return (
    <td style={{ minWidth: 170 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--muted)", marginBottom: 3 }}>
        <span>{inr(r.min)}</span><span>{inr(r.max)}</span>
      </div>
      <div className="rangebar"><div className="rangefill" style={{ width: r.rangePct + "%" }} /></div>
    </td>
  );
}

export default async function CompPage() {
  const session = await getSession();
  const { rows, stats } = await listComp(session);
  const isEmployee = session.role === "employee";
  const canRequest = !isEmployee;
  const canApprove = session.role === "owner" || session.role === "hr_admin";
  const changes = canRequest ? await listCompChanges(session) : [];
  const pendingChanges = changes.filter((c) => c.status === "Pending");
  const history = await listCompHistory(session);

  return (
    <main>
      <div className="top">
        <div>
          <h1>Compensation</h1>
          <div className="sub">
            {isEmployee ? "Your pay vs band" : "Pay bands, compa-ratio & range position"} · viewing as <strong>{session.role}</strong>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {canRequest && rows.length > 0 && <RequestCompChange people={rows.map((r) => ({ id: r.id, name: r.name, salary: r.salary }))} />}
          <span className="badge">INR · annual</span>
        </div>
      </div>

      {isEmployee ? (
        rows.length ? (
          <div className="panel">
            <div className="panel-hd">{rows[0].name}</div>
            <div style={{ padding: "22px" }}>
              <div className="statrow" style={{ marginBottom: 20 }}>
                <div className="stat"><div className="lbl">Annual salary</div><div className="val">{inr(rows[0].salary)}</div><div className="sub2">{rows[0].level} band</div></div>
                <div className="stat"><div className="lbl">Compa-ratio</div><div className="val">{rows[0].compaRatio}</div><div className="sub2">salary ÷ band mid</div></div>
                <div className="stat"><div className="lbl">Status</div><div className="val" style={{ fontSize: 20, marginTop: 14 }}>{statusPill(rows[0].status)}</div></div>
              </div>
              <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Range position ({inr(rows[0].min)} – {inr(rows[0].max)})</label>
              <div className="rangebar" style={{ height: 12, marginTop: 8 }}><div className="rangefill" style={{ width: rows[0].rangePct + "%" }} /></div>
            </div>
            <div className="panel-hd" style={{ borderTop: "1px solid var(--line, #eee)" }}>Salary structure (annual CTC)</div>
            <SalaryStructure annual={rows[0].salary} />
            <div className="panel-hd" style={{ borderTop: "1px solid var(--line, #eee)" }}>Pay change history</div>
            <div style={{ padding: "0 22px 18px" }}><CompHistory history={history.get(rows[0].id) ?? []} /></div>
          </div>
        ) : (
          <div className="empty-cta"><h2>No compensation on file</h2><p>Your pay details aren't set up yet.</p></div>
        )
      ) : (
        <>
          <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="stat"><div className="lbl">Annual payroll</div><div className="val">{inr(stats.payroll)}</div><div className="sub2">{stats.count} active</div></div>
            <div className="stat"><div className="lbl">Average salary</div><div className="val">{inr(stats.avg)}</div><div className="sub2">median {inr(stats.median)}</div></div>
            <div className="stat"><div className="lbl">Below range</div><div className="val">{stats.below}</div><div className="sub2">need review</div></div>
            <div className="stat"><div className="lbl">Above range</div><div className="val">{stats.above}</div><div className="sub2">over max</div></div>
          </div>

          {changes.length > 0 && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-hd">Pay change requests{pendingChanges.length > 0 && <span className="badge">{pendingChanges.length} pending</span>}</div>
              <table>
                <thead><tr><th>Employee</th><th>Current</th><th>New</th><th>Effective</th><th>Reason</th><th>Status</th>{canApprove && <th></th>}</tr></thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.id}>
                      <td>{c.employee}</td>
                      <td>{rupee(c.current_amount)}</td>
                      <td style={{ fontWeight: 600 }}>{rupee(c.new_amount)}</td>
                      <td>{c.effective_date}</td>
                      <td style={{ color: "var(--muted)" }}>{c.reason ?? "—"}</td>
                      <td>{reqPill(c.status)}</td>
                      {canApprove && <td style={{ textAlign: "right" }}>{c.status === "Pending" && <CompDecision reqId={c.id} />}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-hd">Pay bands</div>
            <table>
              <thead><tr><th>Level</th><th>Min</th><th>Mid</th><th>Max</th><th>People</th><th>Avg compa-ratio</th></tr></thead>
              <tbody>
                {stats.bands.map((b) => (
                  <tr key={b.level}>
                    <td style={{ fontWeight: 600 }}>{b.level}</td>
                    <td>{inr(b.min)}</td><td>{inr(b.mid)}</td><td>{inr(b.max)}</td>
                    <td>{b.people}</td><td>{b.avgCompa ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-hd">Compensation detail <span className="badge">click View for structure & history</span></div>
            <table>
              <thead><tr><th>Employee</th><th>Level</th><th>Salary</th><th>Range position</th><th>Compa-ratio</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No employees yet.</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td><span className="av">{initials(r.name)}</span>{r.name}</td>
                      <td><span className="pill">{r.level}</span></td>
                      <td>{inr(r.salary)}</td>
                      {rangeCell(r)}
                      <td>{r.compaRatio}</td>
                      <td>{statusPill(r.status)}</td>
                      <td style={{ textAlign: "right" }}><CompDetailButton name={r.name} salary={r.salary} history={history.get(r.id) ?? []} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
