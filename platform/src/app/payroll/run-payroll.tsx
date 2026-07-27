"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRunAction } from "./actions";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function RunPayroll() {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(thisMonth);
  const [pending, start] = useTransition();
  const router = useRouter();

  const go = () => start(async () => {
    const r = await createRunAction(period);
    if (r.ok) { setOpen(false); router.push(`/payroll/${r.id}`); }
    else alert(r.error);
  });

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>Run payroll</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-hd"><h3>Run payroll</h3><button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
            <div className="modal-bd">
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Pay month</label>
              <input type="month" value={period} max={thisMonth()} onChange={(e) => setPeriod(e.target.value)} />
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
                Generates a <strong>draft</strong> payslip for every active employee from their current salary, prorating any approved <strong>Loss of Pay</strong> leave this month. You can review before finalizing.
              </p>
            </div>
            <div className="modal-ft">
              <button className="btn ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
              <button className="btn" onClick={go} disabled={pending}>{pending ? "Running…" : "Generate draft"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
