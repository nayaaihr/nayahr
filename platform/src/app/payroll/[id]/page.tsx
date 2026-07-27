import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRun } from "@/repos/payroll";
import { getCompany } from "@/repos/company";
import { rupee } from "@/lib/salary";
import { periodLabel } from "@/lib/payroll";
import { RunActions } from "../run-actions";
import { PayslipView } from "../payslip-view";

export const dynamic = "force-dynamic";

const statusPill = (s: string) => <span className={"pill " + (s === "Finalized" ? "green" : "amber")}>{s}</span>;
const rt = { textAlign: "right" as const };

export default async function RunPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!(session.role === "owner" || session.role === "hr_admin")) redirect("/");
  const [run, company] = await Promise.all([getRun(session, params.id), getCompany(session)]);

  if (!run) {
    return (
      <main>
        <div className="top"><div><div className="sub" style={{ marginBottom: 6 }}><Link href="/payroll">← Payroll</Link></div><h1>Payroll run</h1></div></div>
        <div className="empty-cta"><h2>Not found</h2><p>This payroll run doesn&apos;t exist.</p></div>
      </main>
    );
  }

  const t = run.slips.reduce((a, s) => ({
    gross: a.gross + s.gross, lop: a.lop + s.lop, pf: a.pf + s.pf_employee, esi: a.esi + s.esi_employee,
    pt: a.pt + s.pt, tds: a.tds + s.tds, ded: a.ded + s.total_deductions, net: a.net + s.net,
    cost: a.cost + s.gross + s.employer_pf + s.employer_esi,
  }), { gross: 0, lop: 0, pf: 0, esi: 0, pt: 0, tds: 0, ded: 0, net: 0, cost: 0 });

  return (
    <main>
      <div className="top">
        <div>
          <div className="sub" style={{ marginBottom: 6 }}><Link href="/payroll">← Payroll</Link></div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>Payroll · {periodLabel(run.period)} {statusPill(run.status)}</h1>
          <div className="sub">{run.slips.length} employees{run.status === "Finalized" && run.finalized_at ? ` · finalized ${new Date(run.finalized_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : " · draft"}</div>
        </div>
        <RunActions runId={run.id} status={run.status} />
      </div>

      <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat"><div className="lbl">Gross earnings</div><div className="val" style={{ fontSize: 20 }}>{rupee(t.gross)}</div></div>
        <div className="stat"><div className="lbl">Total deductions</div><div className="val" style={{ fontSize: 20 }}>− {rupee(t.ded)}</div><div className="sub2">PF {rupee(t.pf)} · TDS {rupee(t.tds)}</div></div>
        <div className="stat"><div className="lbl">Net pay</div><div className="val" style={{ fontSize: 20 }}>{rupee(t.net)}</div></div>
        <div className="stat"><div className="lbl">Employer cost</div><div className="val" style={{ fontSize: 20 }}>{rupee(t.cost)}</div><div className="sub2">incl. PF/ESI</div></div>
      </div>

      <div className="panel">
        <div className="panel-hd">Payslips</div>
        <table>
          <thead><tr>
            <th>Employee</th><th style={rt}>Gross</th><th style={rt}>LOP</th><th style={rt}>PF</th><th style={rt}>ESI</th><th style={rt}>PT</th><th style={rt}>TDS</th><th style={rt}>Net pay</th><th></th>
          </tr></thead>
          <tbody>
            {run.slips.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No employees in this run.</td></tr>
            ) : run.slips.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={rt}>{rupee(s.gross)}</td>
                <td style={{ ...rt, color: s.lop ? "var(--red)" : "var(--muted)" }}>{s.lop ? "− " + rupee(s.lop) : "—"}</td>
                <td style={{ ...rt, color: "var(--muted)" }}>{rupee(s.pf_employee)}</td>
                <td style={{ ...rt, color: "var(--muted)" }}>{s.esi_employee ? rupee(s.esi_employee) : "—"}</td>
                <td style={{ ...rt, color: "var(--muted)" }}>{rupee(s.pt)}</td>
                <td style={{ ...rt, color: "var(--muted)" }}>{rupee(s.tds)}</td>
                <td style={{ ...rt, fontWeight: 600 }}>{rupee(s.net)}</td>
                <td style={rt}><PayslipView slip={s} period={run.period} company={company.name} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
