"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createRun, finalizeRun, deleteRun, reopenRun, regenerateRun, getBankExport, getStatutorySummary } from "@/repos/payroll";
import { periodLabel } from "@/lib/payroll";
import { toCsv } from "@/lib/csv";

export type R = { ok: true } | { ok: false; error: string };
export type ExportR = { ok: true; filename: string; csv: string; missing?: number } | { ok: false; error: string };
const money = (n: number) => n.toFixed(2);

export async function createRunAction(period: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const id = await createRun(await getSession(), period);
    revalidatePath("/payroll");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't run payroll." };
  }
}

async function run(fn: () => Promise<void>): Promise<R> {
  try {
    await fn();
    revalidatePath("/payroll");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function finalizeRunAction(runId: string): Promise<R> { return run(async () => finalizeRun(await getSession(), runId)); }
export async function deleteRunAction(runId: string): Promise<R> { return run(async () => deleteRun(await getSession(), runId)); }
export async function reopenRunAction(runId: string): Promise<R> { return run(async () => reopenRun(await getSession(), runId)); }
export async function regenerateRunAction(runId: string): Promise<R> { return run(async () => regenerateRun(await getSession(), runId)); }

/** Bank NEFT upload file: one row per employee with net pay. */
export async function exportBankFileAction(runId: string): Promise<ExportR> {
  try {
    const data = await getBankExport(await getSession(), runId);
    if (!data) return { ok: false, error: "Payroll run not found." };
    const headers = ["Beneficiary Name", "Account Number", "IFSC", "UPI ID", "Amount", "Payment Mode", "Remarks"];
    const remark = `Salary ${periodLabel(data.period)}`;
    const rows = data.rows.map((r) => {
      const mode = r.bankAccount && r.bankIfsc ? "NEFT" : r.upiId ? "UPI" : "MISSING";
      return [r.name, r.bankAccount ?? "", r.bankIfsc ?? "", r.upiId ?? "", money(r.net), mode, remark];
    });
    return { ok: true, filename: `bank-transfer-${data.period}.csv`, csv: toCsv(headers, rows), missing: data.missing };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Export failed." };
  }
}

/** Statutory filing summary: PF / ESI / PT / TDS per employee + a totals row. */
export async function exportStatutoryAction(runId: string): Promise<ExportR> {
  try {
    const data = await getStatutorySummary(await getSession(), runId);
    if (!data) return { ok: false, error: "Payroll run not found." };
    const headers = ["Employee", "PAN", "UAN", "Gross", "PF (Employee)", "PF (Employer)", "ESI (Employee)", "ESI (Employer)", "PT", "TDS"];
    const rows = data.rows.map((r) => [r.name, r.pan ?? "", r.uan ?? "", money(r.gross), money(r.pfEmployee), money(r.employerPf), money(r.esiEmployee), money(r.employerEsi), money(r.pt), money(r.tds)]);
    const t = data.totals;
    rows.push(["TOTAL", "", "", money(t.gross), money(t.pfEmployee), money(t.employerPf), money(t.esiEmployee), money(t.employerEsi), money(t.pt), money(t.tds)]);
    return { ok: true, filename: `statutory-summary-${data.period}.csv`, csv: toCsv(headers, rows) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Export failed." };
  }
}
