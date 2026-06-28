"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestCompAction, decideCompAction } from "./actions";

type Person = { id: string; name: string; salary: number };

export function RequestCompChange({ people }: { people: Person[] }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [picked, setPicked] = useState(people[0]?.id ?? "");
  const current = people.find((p) => p.id === picked)?.salary;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    start(async () => {
      const res = await requestCompAction(fd);
      if (res.ok) { setOpen(false); router.refresh(); } else setErr(res.error);
    });
  }

  return (
    <>
      <button className="btn" onClick={() => { setErr(null); setOpen(true); }}>Request pay change</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal">
            <div className="modal-hd"><h3>Request pay change</h3><button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
            <form onSubmit={onSubmit}>
              <div className="modal-bd">
                {err && <div className="err">{err}</div>}
                <div><label>Employee</label>
                  <select name="workerId" value={picked} onChange={(e) => setPicked(e.target.value)}>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="frow">
                  <div><label>Current (annual ₹)</label><input value={current != null ? current.toLocaleString("en-IN") : "—"} disabled /></div>
                  <div><label>New annual ₹</label><input type="number" name="newAmount" required min={1} placeholder="e.g. 1200000" /></div>
                </div>
                <div style={{ maxWidth: 200 }}><label>Effective date</label><input type="date" name="effectiveDate" defaultValue={today} /></div>
                <div><label>Reason</label><input name="reason" placeholder="e.g. Annual increment / promotion" /></div>
                <p className="hint">This goes to HR for approval. On approval it's recorded as an effective-dated compensation change.</p>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={pending}>{pending ? "Submitting…" : "Submit for approval"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function CompDecision({ reqId }: { reqId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (approve: boolean) => start(async () => {
    const r = await decideCompAction(reqId, approve);
    if (r.ok) router.refresh(); else alert(r.error);
  });
  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn sm" disabled={pending} onClick={() => go(true)}>Approve</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => go(false)}>Reject</button>
    </span>
  );
}
