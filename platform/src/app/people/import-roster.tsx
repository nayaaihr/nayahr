"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewRoster, importRoster, type PreviewActionResult } from "./actions";
import type { RosterPreview } from "@/lib/import-parse";

const SAMPLE = `name,title,department,location,salary,hire date,email
Priya Nair,Senior Engineer,Engineering,Pune,1400000,2023-04-12,priya.nair@acme.example
Rahul Bose,Account Executive,Sales,Mumbai,900000,2024-01-08,rahul.bose@acme.example`;

const rupee = (n: number) => (n ? "₹" + n.toLocaleString("en-IN") : "—");

export function ImportRoster({ variant = "button" }: { variant?: "button" | "cta" }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<RosterPreview | null>(null);
  const [csv, setCsv] = useState<string>("");
  const [done, setDone] = useState<{ imported: number; errors: string[] } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const reset = () => { setErr(null); setPreview(null); setCsv(""); setDone(null); };
  const openModal = () => { reset(); setOpen(true); };

  function onPreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    start(async () => {
      const res: PreviewActionResult = await previewRoster(fd);
      if (res.ok) { setPreview(res.preview); setCsv(res.csv); }
      else setErr(res.error);
    });
  }

  function confirmImport() {
    setErr(null);
    start(async () => {
      const fd = new FormData();
      fd.set("csv", csv);
      const res = await importRoster(fd);
      if (res.ok) { setDone(res.result); setPreview(null); router.refresh(); }
      else setErr(res.error);
    });
  }

  return (
    <>
      {variant === "cta" ? (
        <button className="btn" onClick={openModal}>Import your roster</button>
      ) : (
        <button className="btn ghost" onClick={openModal}>Import CSV</button>
      )}

      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: preview ? 720 : undefined }}>
            <div className="modal-hd">
              <h3>Import employees from CSV</h3>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            {/* Step 3 — done */}
            {done ? (
              <>
                <div className="modal-bd">
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
                </div>
                <div className="modal-ft">
                  <button type="button" className="btn" onClick={() => setOpen(false)}>Done</button>
                </div>
              </>
            ) : preview ? (
              /* Step 2 — review before import */
              <>
                <div className="modal-bd" style={{ maxHeight: "62vh", overflow: "auto" }}>
                  {err && <div className="err">{err}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <strong>{preview.count} employee{preview.count === 1 ? "" : "s"} ready to import</strong>
                    {preview.warnings > 0 && <span className="pill amber">{preview.warnings} warning{preview.warnings === 1 ? "" : "s"}</span>}
                  </div>
                  <table>
                    <thead><tr><th>Name</th><th>Title</th><th>Dept</th><th>Location</th><th style={{ textAlign: "right" }}>Salary</th><th>Hired</th></tr></thead>
                    <tbody>
                      {preview.rows.slice(0, 100).map((r) => (
                        <tr key={r.rowNumber}>
                          <td style={{ fontWeight: 600 }}>
                            {r.name}
                            {r.warnings.length > 0 && (
                              <div style={{ fontSize: 11, color: "var(--amber, #b8860b)", marginTop: 2 }}>⚠ {r.warnings.join("; ")}</div>
                            )}
                          </td>
                          <td>{r.title || "Employee"}</td>
                          <td>{r.dept || "—"}</td>
                          <td>{r.loc || "—"}</td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{rupee(r.salary)}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{r.hired}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.count > 100 && <p className="hint">Showing the first 100 of {preview.count} rows — all will be imported.</p>}
                  <p className="hint">Departments and locations are created automatically. Each row records a dated Hire event + starting compensation.</p>
                </div>
                <div className="modal-ft">
                  <button type="button" className="btn ghost" onClick={() => { setPreview(null); setErr(null); }}>Back</button>
                  <button type="button" className="btn" disabled={pending} onClick={confirmImport}>
                    {pending ? "Importing…" : `Import ${preview.count} employee${preview.count === 1 ? "" : "s"}`}
                  </button>
                </div>
              </>
            ) : (
              /* Step 1 — choose file / paste */
              <form onSubmit={onPreview}>
                <div className="modal-bd">
                  {err && <div className="err">{err}</div>}
                  <label>CSV file</label>
                  <input type="file" name="file" accept=".csv,text/csv" />
                  <p className="hint">
                    Columns: <code>name, title, department, location, salary, hire date, email</code>.
                    Only <code>name</code> is required. Commas inside quoted fields are handled.
                  </p>
                  <label style={{ marginTop: 12 }}>…or paste CSV</label>
                  <textarea name="csv" rows={5} placeholder={SAMPLE} style={{
                    width: "100%", font: "inherit", fontFamily: "ui-monospace, monospace", fontSize: 12,
                    padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 10,
                  }} />
                </div>
                <div className="modal-ft">
                  <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                  <button type="submit" className="btn" disabled={pending}>{pending ? "Reading…" : "Preview"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
