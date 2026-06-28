import { getSession } from "@/lib/session";
import { buildReport, type Slice } from "@/repos/reports";

export const dynamic = "force-dynamic";

const inr = (n: number) => "₹" + (n / 100000).toFixed(1) + "L";

function BarList({ rows }: { rows: Slice[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div style={{ padding: 22 }}>
      {rows.length === 0 ? <div style={{ color: "var(--muted)" }}>No data.</div> : rows.map((r) => (
        <div key={r.name} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{r.name}</span><span style={{ color: "var(--muted)" }}>{r.n}</span>
          </div>
          <div className="rangebar"><div className="rangefill" style={{ width: (r.n / max) * 100 + "%" }} /></div>
        </div>
      ))}
    </div>
  );
}

export default async function ReportsPage() {
  const session = await getSession();
  if (session.role === "employee") {
    return (
      <main>
        <div className="top"><div><h1>Reports</h1><div className="sub">Workforce analytics</div></div></div>
        <div className="empty-cta"><h2>Not available</h2><p>Reporting is available to managers and HR admins.</p></div>
      </main>
    );
  }
  const r = await buildReport(session);

  return (
    <main>
      <div className="top">
        <div>
          <h1>Reports</h1>
          <div className="sub">{r.scope === "team" ? "Your team" : "Organisation"} analytics · viewing as <strong>{session.role}</strong></div>
        </div>
        <span className="badge">live · across all modules</span>
      </div>

      <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat"><div className="lbl">Active headcount</div><div className="val">{r.headcount.active}</div><div className="sub2">{r.headcount.terminated} inactive</div></div>
        <div className="stat"><div className="lbl">Joiners (90d)</div><div className="val">{r.headcount.joiners90}</div><div className="sub2">recent hires</div></div>
        <div className="stat"><div className="lbl">Annual payroll</div><div className="val">{inr(r.comp.payroll)}</div><div className="sub2">avg {inr(r.comp.avg)}</div></div>
        <div className="stat"><div className="lbl">Open roles</div><div className="val">{r.recruiting.openReqs}</div><div className="sub2">{r.recruiting.pipeline} in pipeline</div></div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hd">Headcount by department</div>
        <BarList rows={r.headcount.byDept} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="panel">
          <div className="panel-hd">Headcount by location</div>
          <BarList rows={r.headcount.byLocation} />
        </div>
        <div className="panel">
          <div className="panel-hd">Compensation</div>
          <table>
            <tbody>
              <tr><td>Annual payroll</td><td style={{ textAlign: "right", fontWeight: 600 }}>{inr(r.comp.payroll)}</td></tr>
              <tr><td>Average salary</td><td style={{ textAlign: "right" }}>{inr(r.comp.avg)}</td></tr>
              <tr><td>Median salary</td><td style={{ textAlign: "right" }}>{inr(r.comp.median)}</td></tr>
              <tr><td>Below range</td><td style={{ textAlign: "right" }}><span className="pill amber">{r.comp.below}</span></td></tr>
              <tr><td>Above range</td><td style={{ textAlign: "right" }}><span className="pill red">{r.comp.above}</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="panel">
          <div className="panel-hd">Recruiting</div>
          <table>
            <tbody>
              <tr><td>Open requisitions</td><td style={{ textAlign: "right", fontWeight: 600 }}>{r.recruiting.openReqs}</td></tr>
              <tr><td>Candidates in pipeline</td><td style={{ textAlign: "right" }}>{r.recruiting.pipeline}</td></tr>
              <tr><td>Offers out</td><td style={{ textAlign: "right" }}>{r.recruiting.offers}</td></tr>
              <tr><td>Hired</td><td style={{ textAlign: "right" }}><span className="pill green">{r.recruiting.hired}</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="panel-hd">Performance</div>
          <table>
            <tbody>
              <tr><td>Reviews closed</td><td style={{ textAlign: "right", fontWeight: 600 }}>{r.performance.closedPct}%</td></tr>
              <tr><td>Avg rating</td><td style={{ textAlign: "right" }}>{r.performance.avgRating || "—"} / 5</td></tr>
              <tr><td>Reviews in progress</td><td style={{ textAlign: "right" }}>{r.performance.awaiting}</td></tr>
              <tr><td>Goals on track</td><td style={{ textAlign: "right" }}><span className="pill green">{r.performance.goalsOnTrack}</span></td></tr>
              <tr><td>Goals at risk</td><td style={{ textAlign: "right" }}><span className="pill red">{r.performance.goalsAtRisk}</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
