"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEmployee } from "./actions";
import type { RefItem } from "@/repos/people";

export function AddEmployee({ departments, locations }: { departments: RefItem[]; locations: RefItem[] }) {
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
      const res = await addEmployee(fd);
      if (res.ok) {
        setOpen(false);
        router.refresh(); // reflect the new row + count
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <>
      <button className="btn" onClick={() => { setErr(null); setOpen(true); }}>+ Add employee</button>

      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal">
            <div className="modal-hd">
              <h3>Add employee</h3>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-bd">
                {err && <div className="err">{err}</div>}
                <div className="frow">
                  <div><label>Full name</label><input name="full_name" required placeholder="e.g. Priya Sharma" /></div>
                  <div><label>Title</label><input name="title" placeholder="e.g. Software Engineer" /></div>
                </div>
                <div className="frow">
                  <div><label>Department</label>
                    <select name="department_id" defaultValue="">
                      <option value="">—</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><label>Location</label>
                    <select name="location_id" defaultValue="">
                      <option value="">—</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="frow">
                  <div><label>Hire date</label><input type="date" name="hired_on" defaultValue={today} /></div>
                  <div><label>Annual salary (₹)</label><input type="number" name="salary" defaultValue={600000} min={0} /></div>
                </div>
                <div><label>Email</label><input type="email" name="email" placeholder="optional" /></div>
                <p className="hint">A dated <b>Hire</b> event + compensation are recorded on the effective-dated timeline, and the change is written to the audit log.</p>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={pending}>{pending ? "Adding…" : "Add employee"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
