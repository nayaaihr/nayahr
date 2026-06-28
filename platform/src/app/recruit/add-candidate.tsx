"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCandidateAction } from "./actions";

export function AddCandidate({ reqs }: { reqs: Array<{ id: string; title: string }> }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    start(async () => {
      const res = await addCandidateAction(fd);
      if (res.ok) { setOpen(false); router.refresh(); } else setErr(res.error);
    });
  }

  if (reqs.length === 0) return null;
  return (
    <>
      <button className="btn ghost sm" onClick={() => { setErr(null); setOpen(true); }}>+ Add candidate</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal">
            <div className="modal-hd"><h3>Add candidate</h3><button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
            <form onSubmit={onSubmit}>
              <div className="modal-bd">
                {err && <div className="err">{err}</div>}
                <div><label>Requisition</label>
                  <select name="reqId" defaultValue={reqs[0]?.id}>{reqs.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select>
                </div>
                <div className="frow">
                  <div><label>Candidate name</label><input name="name" required placeholder="e.g. Aisha Khan" /></div>
                  <div><label>Email</label><input name="email" type="email" placeholder="optional" /></div>
                </div>
                <div style={{ maxWidth: 220 }}><label>Source</label>
                  <select name="source" defaultValue="LinkedIn"><option>LinkedIn</option><option>Referral</option><option>Naukri</option><option>Company site</option><option>Agency</option></select>
                </div>
                <p className="hint">The candidate enters the pipeline at the “Applied” stage. Advance them through to Offer, then Hire.</p>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={pending}>{pending ? "Adding…" : "Add candidate"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
