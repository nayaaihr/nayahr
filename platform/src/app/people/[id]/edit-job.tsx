"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeJobAction } from "./actions";

type Opt = { id: string; name: string };

export function EditJob({ workerId, current, departments, locations, people }: {
  workerId: string;
  current: { title: string; department: string | null; location: string | null; managerId: string | null; status: string };
  departments: Opt[]; locations: Opt[]; people: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const deptId = departments.find((d) => d.name === current.department)?.id ?? "";
  const locId = locations.find((l) => l.name === current.location)?.id ?? "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    start(async () => {
      const res = await changeJobAction(workerId, fd);
      if (res.ok) { setOpen(false); router.refresh(); } else setErr(res.error);
    });
  }

  return (
    <>
      <button className="btn" onClick={() => { setErr(null); setOpen(true); }}>Edit job details</button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal">
            <div className="modal-hd"><h3>Edit job details</h3><button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
            <form onSubmit={onSubmit}>
              <div className="modal-bd">
                {err && <div className="err">{err}</div>}
                <div className="frow">
                  <div><label>Job title</label><input name="title" required defaultValue={current.title} /></div>
                  <div><label>Effective date</label><input type="date" name="effectiveDate" defaultValue={today} required /></div>
                </div>
                <div className="frow">
                  <div><label>Department</label>
                    <select name="departmentId" defaultValue={deptId}><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                  </div>
                  <div><label>Location</label>
                    <select name="locationId" defaultValue={locId}><option value="">—</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                  </div>
                </div>
                <div className="frow">
                  <div><label>Manager</label>
                    <select name="managerId" defaultValue={current.managerId ?? ""}><option value="">— none —</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  </div>
                  <div><label>Status</label>
                    <select name="status" defaultValue={current.status}><option>Active</option><option>On leave</option><option>Terminated</option></select>
                  </div>
                </div>
                <p className="hint">This records an effective-dated change — the previous values are preserved in the job history below.</p>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : "Save change"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
