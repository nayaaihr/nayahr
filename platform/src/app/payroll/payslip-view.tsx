"use client";

import { useState } from "react";
import { rupee } from "@/lib/salary";
import { periodLabel } from "@/lib/payroll";
import type { PayslipRow } from "@/repos/payroll";

const Row = ({ label, value, strong = false, muted = false }: { label: string; value: string; strong?: boolean; muted?: boolean }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontWeight: strong ? 700 : 400, color: muted ? "var(--muted)" : "var(--ink)", borderTop: strong ? "1px solid var(--line)" : "none", marginTop: strong ? 4 : 0 }}>
    <span>{label}</span><span>{value}</span>
  </div>
);

export function PayslipView({ slip, period, company }: { slip: PayslipRow; period: string; company: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn ghost sm" onClick={() => setOpen(true)}>Payslip</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-hd">
              <div>
                <h3 style={{ margin: 0 }}>{company}</h3>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Payslip · {periodLabel(period)}</div>
              </div>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-bd" style={{ maxHeight: "72vh", overflow: "auto" }}>
              <div style={{ fontWeight: 650, fontSize: 15, marginBottom: 2 }}>{slip.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 16 }}>Net pay for {periodLabel(period)}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)", marginBottom: 4 }}>Earnings</div>
                  <Row label="Basic" value={rupee(slip.basic)} />
                  <Row label="HRA" value={rupee(slip.hra)} />
                  <Row label="Conveyance" value={rupee(slip.conveyance)} />
                  <Row label="Special allowance" value={rupee(slip.special)} />
                  <Row label="Gross earnings" value={rupee(slip.gross)} strong />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)", marginBottom: 4 }}>Deductions</div>
                  {slip.lop > 0 && <Row label={`Loss of pay (${slip.lop_days}d)`} value={"− " + rupee(slip.lop)} />}
                  <Row label="Provident Fund" value={"− " + rupee(slip.pf_employee)} />
                  {slip.esi_employee > 0 && <Row label="ESI" value={"− " + rupee(slip.esi_employee)} />}
                  <Row label="Professional tax" value={"− " + rupee(slip.pt)} />
                  <Row label="TDS (estimated)" value={"− " + rupee(slip.tds)} />
                  <Row label="Total deductions" value={"− " + rupee(slip.total_deductions)} strong />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, padding: "14px 16px", background: "var(--brand-soft)", borderRadius: 12 }}>
                <span style={{ fontWeight: 650, color: "var(--brand-deep)" }}>Net pay</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: "var(--brand-deep)" }}>{rupee(slip.net)}</span>
              </div>

              <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
                <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Employer contributions</div>
                <Row label="Employer PF (12%)" value={rupee(slip.employer_pf)} muted />
                {slip.employer_esi > 0 && <Row label="Employer ESI (3.25%)" value={rupee(slip.employer_esi)} muted />}
                <Row label="Cost to company" value={rupee(slip.gross + slip.employer_pf + slip.employer_esi)} muted />
              </div>

              <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}>
                TDS is an estimate under the new tax regime (standard deduction + §87A rebate) and excludes investment declarations, HRA exemption and other proofs. Statutory rates are configurable.
              </p>
            </div>
            <div className="modal-ft">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Close</button>
              <button type="button" className="btn" onClick={() => window.print()}>Print</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
