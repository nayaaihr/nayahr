"use client";

import { useState } from "react";
import { salaryBreakdown, rupee } from "@/lib/salary";

export type HistRow = { effective_date: string; amount: number };

export function SalaryStructure({ annual }: { annual: number }) {
  const rows = salaryBreakdown(annual);
  return (
    <table>
      <thead><tr><th>Component</th><th style={{ textAlign: "right" }}>Monthly</th><th style={{ textAlign: "right" }}>Annual</th></tr></thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.label}>
            <td>{c.label} {c.note && <span style={{ color: "var(--muted)", fontSize: 11 }}>· {c.note}</span>}</td>
            <td style={{ textAlign: "right" }}>{rupee(c.monthly)}</td>
            <td style={{ textAlign: "right" }}>{rupee(c.annual)}</td>
          </tr>
        ))}
        <tr style={{ fontWeight: 700 }}>
          <td>Total CTC</td>
          <td style={{ textAlign: "right" }}>{rupee(annual / 12)}</td>
          <td style={{ textAlign: "right" }}>{rupee(annual)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function CompHistory({ history }: { history: HistRow[] }) {
  if (!history.length) return <p className="rv-muted" style={{ padding: "0 2px" }}>No pay history on record.</p>;
  return (
    <table>
      <thead><tr><th>Effective date</th><th style={{ textAlign: "right" }}>Annual salary</th><th style={{ textAlign: "right" }}>Change</th></tr></thead>
      <tbody>
        {history.map((h, i) => {
          const prev = history[i + 1]?.amount;
          const delta = prev != null ? h.amount - prev : null;
          return (
            <tr key={i}>
              <td>{h.effective_date}{i === 0 && <span className="pill green" style={{ marginLeft: 8 }}>current</span>}</td>
              <td style={{ textAlign: "right" }}>{rupee(h.amount)}</td>
              <td style={{ textAlign: "right", color: delta == null ? "var(--muted)" : delta >= 0 ? "var(--green)" : "var(--red)" }}>
                {delta == null ? "—" : (delta >= 0 ? "+" : "") + rupee(delta)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function CompDetailButton({ name, salary, history }: { name: string; salary: number; history: HistRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn ghost sm" onClick={() => setOpen(true)}>View</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-hd"><h3>{name} — compensation</h3><button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
            <div className="modal-bd" style={{ maxHeight: "70vh", overflow: "auto" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", margin: "2px 0 8px" }}>Salary structure</div>
              <SalaryStructure annual={salary} />
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", margin: "20px 0 8px" }}>Change history</div>
              <CompHistory history={history} />
            </div>
            <div className="modal-ft"><button type="button" className="btn ghost" onClick={() => setOpen(false)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}
