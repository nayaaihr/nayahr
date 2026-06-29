"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReqAction } from "./actions";

export function NewReq({ canApprove }: { canApprove: boolean }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const note = canApprove
    ? "This requisition opens immediately."
    : "This requisition will be sent to HR for approval before it opens.";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    start(async () => {
      const res = await createReqAction(fd);
      if (res.ok) { setOpen(false); router.refresh(); } else setErr(res.error);
    });
  }

  return (
    <>
      <button className="btn" onClick={() => { setErr(null); setOpen(true); }}>+ New requisition</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal">
            <div className="modal-hd"><h3>New requisition</h3><button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
            <form onSubmit={onSubmit}>
              <div className="modal-bd">
                {err && <div className="err">{err}</div>}
                <div className="frow">
                  <div><label>Role title</label><input name="title" required placeholder="e.g. Senior Engineer" /></div>
                  <div><label>Department</label><input name="department" placeholder="e.g. Engineering" /></div>
                </div>
                <div className="frow">
                  <div><label>Location</label><input name="location" placeholder="e.g. Bengaluru" /></div>
                  <div><label>Openings</label><input type="number" name="openings" defaultValue={1} min={1} /></div>
                </div>
                <div><label>Description / notes</label>
                  <textarea name="description" rows={4} placeholder="Role context, must-have skills, why we're hiring, team, budget notes…" />
                </div>
                <p className="hint">{note}</p>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={pending}>{pending ? "Creating…" : "Create requisition"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
