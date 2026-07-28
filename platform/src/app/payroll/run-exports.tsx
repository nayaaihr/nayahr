"use client";

import { useTransition } from "react";
import { exportBankFileAction, exportStatutoryAction, type ExportR } from "./actions";

function downloadCsv(filename: string, csv: string) {
  // Prepend a BOM so Excel opens UTF-8 (₹, names) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download the bank NEFT file + the statutory summary for a run. */
export function RunExports({ runId }: { runId: string }) {
  const [pending, start] = useTransition();

  const go = (fn: () => Promise<ExportR>, after?: (r: Extract<ExportR, { ok: true }>) => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) { alert(r.error); return; }
      downloadCsv(r.filename, r.csv);
      after?.(r);
    });

  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button
        className="btn ghost"
        disabled={pending}
        onClick={() => go(() => exportBankFileAction(runId), (r) => {
          if (r.missing) alert(`${r.missing} employee(s) have no bank account / IFSC on file.\n\nAdd it under Bank & statutory on their profile, then export again.`);
        })}
      >
        Bank file
      </button>
      <button className="btn ghost" disabled={pending} onClick={() => go(() => exportStatutoryAction(runId))}>
        Statutory summary
      </button>
    </span>
  );
}
