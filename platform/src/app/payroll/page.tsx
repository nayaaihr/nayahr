import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listRuns } from "@/repos/payroll";
import { rupee } from "@/lib/salary";
import { periodLabel } from "@/lib/payroll";
import { RunPayroll } from "./run-payroll";

export const dynamic = "force-dynamic";

const statusPill = (s: string) => <span className={"pill " + (s === "Finalized" ? "green" : "amber")}>{s}</span>;

export default async function PayrollPage() {
  const session = await getSession();
  if (!(session.role === "owner" || session.role === "hr_admin")) redirect("/");
  const runs = await listRuns(session);

  const latest = runs[0];

  return (
    <main>
      <div className="top">
        <div>
          <h1>Payroll</h1>
          <div className="sub">Monthly runs &amp; payslips · India statutory (PF · ESI · PT · TDS)</div>
        </div>
        <RunPayroll />
      </div>

      {runs.length === 0 ? (
        <div className="empty-cta">
          <h2>Run your first payroll</h2>
          <p>Pick a month and NayaHR generates a draft payslip for every active employee — gross, statutory deductions and net pay — from their current salary. Review, then finalize.</p>
          <div style={{ marginTop: 18 }}><RunPayroll /></div>
        </div>
      ) : (
        <>
          <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="stat"><div className="lbl">Latest run</div><div className="val" style={{ fontSize: 18, marginTop: 12 }}>{periodLabel(latest.period)}</div><div className="sub2">{statusPill(latest.status)}</div></div>
            <div className="stat"><div className="lbl">Employees paid</div><div className="val">{latest.headcount}</div></div>
            <div className="stat"><div className="lbl">Net disbursed</div><div className="val" style={{ fontSize: 20 }}>{rupee(latest.net)}</div></div>
            <div className="stat"><div className="lbl">Employer cost</div><div className="val" style={{ fontSize: 20 }}>{rupee(latest.cost)}</div><div className="sub2">incl. PF/ESI</div></div>
          </div>

          <div className="panel">
            <div className="panel-hd">Payroll runs</div>
            <table>
              <thead><tr><th>Period</th><th>Status</th><th style={{ textAlign: "right" }}>Employees</th><th style={{ textAlign: "right" }}>Gross</th><th style={{ textAlign: "right" }}>Deductions</th><th style={{ textAlign: "right" }}>Net pay</th><th style={{ textAlign: "right" }}>Employer cost</th></tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}><Link href={`/payroll/${r.id}`} className="row-link">{periodLabel(r.period)}</Link></td>
                    <td>{statusPill(r.status)}</td>
                    <td style={{ textAlign: "right" }}>{r.headcount}</td>
                    <td style={{ textAlign: "right" }}>{rupee(r.gross)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>− {rupee(r.deductions)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{rupee(r.net)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{rupee(r.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="note">
        Statutory rules (v1): Employee PF 12% of Basic, ESI 0.75%/3.25% up to ₹21,000 gross, Professional Tax ₹200/mo,
        TDS estimated under the new regime. Finalized payslips are immutable and visible to each employee on their profile.
      </p>
    </main>
  );
}
