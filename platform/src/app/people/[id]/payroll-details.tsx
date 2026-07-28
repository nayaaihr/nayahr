"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePayrollDetailsAction } from "./actions";

type Details = { bankAccount: string | null; bankIfsc: string | null; pan: string | null; uan: string | null };

/** HR-only editor for a worker's bank + statutory identifiers (used by the
 *  payroll bank file and statutory summary). Read view shows a masked account. */
export function PayrollDetails({ workerId, current }: { workerId: string; current: Details }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const has = current.bankAccount || current.bankIfsc || current.pan || current.uan;
  const mask = (a: string | null) => (a ? "•••• " + a.slice(-4) : "—");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await savePayrollDetailsAction(workerId, fd);
      if (!r.ok) { alert(r.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)", padding: 18, alignItems: "start" }}>
        <div className="stat"><div className="lbl">Bank account</div><div className="val" style={{ fontSize: 14, marginTop: 14 }}>{mask(current.bankAccount)}</div></div>
        <div className="stat"><div className="lbl">IFSC</div><div className="val" style={{ fontSize: 14, marginTop: 14 }}>{current.bankIfsc ?? "—"}</div></div>
        <div className="stat"><div className="lbl">PAN</div><div className="val" style={{ fontSize: 14, marginTop: 14 }}>{current.pan ?? "—"}</div></div>
        <div className="stat">
          <div className="lbl">UAN (PF)</div>
          <div className="val" style={{ fontSize: 14, marginTop: 14 }}>{current.uan ?? "—"}</div>
          <div style={{ marginTop: 10 }}><button className="btn ghost sm" onClick={() => setOpen(true)}>{has ? "Edit" : "Add details"}</button></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ padding: 18 }}>
      <div className="frow">
        <div><label>Bank account number</label><input name="bankAccount" defaultValue={current.bankAccount ?? ""} placeholder="Account number" inputMode="numeric" /></div>
        <div><label>IFSC</label><input name="bankIfsc" defaultValue={current.bankIfsc ?? ""} placeholder="HDFC0001234" /></div>
      </div>
      <div className="frow">
        <div><label>PAN</label><input name="pan" defaultValue={current.pan ?? ""} placeholder="ABCDE1234F" /></div>
        <div><label>UAN (PF)</label><input name="uan" defaultValue={current.uan ?? ""} placeholder="12-digit UAN" inputMode="numeric" /></div>
      </div>
      <p className="hint">Used for the payroll bank transfer file and the PF/ESI/PT/TDS statutory summary.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : "Save details"}</button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
