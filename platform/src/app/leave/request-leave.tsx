"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestLeaveAction } from "./actions";

export function RequestLeave({ types }: { types: Array<{ name: string; note?: string }> }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    start(async () => {
      const res = await requestLeaveAction(fd);
      if (res.ok) { setOpen(false); router.refresh(); }
      else setErr(res.error);
    });
  }

  return (
    <>
      <button className="btn" onClick={() => { setErr(null); setOpen(true); }}>Request time off</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal">
            <div className="modal-hd">
              <h3>Request time off</h3>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-bd">
                {err && <div className="err">{err}</div>}
                <div className="frow">
                  <div>
                    <label>Type</label>
                    <select name="type" defaultValue={types[0]?.name}>
                      {types.map((t) => <option key={t.name} value={t.name}>{t.name}{t.note ? ` (${t.note})` : ""}</option>)}
                    </select>
                  </div>
                  <div><label>Start date</label><input type="date" name="from_date" defaultValue={today} /></div>
                </div>
                <div style={{ maxWidth: 160 }}><label>Days</label><input type="number" name="days" defaultValue={1} min={1} /></div>
                <p className="hint">Your request goes to your manager for approval and is recorded in the audit log.</p>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={pending}>{pending ? "Submitting…" : "Submit request"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
