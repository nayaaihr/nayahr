"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importRoster } from "./actions";

const SAMPLE = `name,title,department,location,salary,hire date,email
Priya Nair,Senior Engineer,Engineering,Pune,1400000,2023-04-12,priya.nair@acme.example
Rahul Bose,Account Executive,Sales,Mumbai,900000,2024-01-08,rahul.bose@acme.example`;

export function ImportRoster({ variant = "button" }: { variant?: "button" | "cta" }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ imported: number; errors: string[] } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null); setDone(null);
    start(async () => {
      const res = await importRoster(fd);
      if (res.ok) { setDone(res.result); router.refresh(); }
      else setErr(res.error);
    });
  }

  return (
    <>
      {variant === "cta" ? (
        <button className="btn" onClick={() => { setErr(null); setDone(null); setOpen(true); }}>Import your roster</button>
      ) : (
        <button className="btn ghost" onClick={() => { setErr(null); setDone(null); setOpen(true); }}>Import CSV</button>
      )}

      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal">
            <div className="modal-hd">
              <h3>Import employees from CSV</h3>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-bd">
                {err && <div className="err">{err}</div>}
                {done && (
                  <div className="ok">
                    Imported {done.imported} employee{done.imported === 1 ? "" : "s"}.
                    {done.errors.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12.5 }}>
                        {done.errors.length} row(s) skipped:
                        <ul style={{ margin: "6px 0 0 18px" }}>
                          {done.errors.slice(0, 8).map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {!done && (
                  <>
                    <label>CSV file</label>
                    <input type="file" name="file" accept=".csv,text/csv" />
                    <p className="hint">
                      Columns: <code>name, title, department, location, salary, hire date, email</code>.
                      Only <code>name</code> is required. Departments and locations are created automatically.
                      Each row records a dated Hire event + starting compensation.
                    </p>
                    <label style={{ marginTop: 12 }}>…or paste CSV</label>
                    <textarea name="csv" rows={5} placeholder={SAMPLE} style={{
                      width: "100%", font: "inherit", fontFamily: "ui-monospace, monospace", fontSize: 12,
                      padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10,
                    }} />
                  </>
                )}
              </div>
              <div className="modal-ft">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>{done ? "Done" : "Cancel"}</button>
                {!done && <button type="submit" className="btn" disabled={pending}>{pending ? "Importing…" : "Import"}</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
