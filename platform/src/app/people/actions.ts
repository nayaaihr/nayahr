"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createWorker } from "@/repos/people-write";
import { importEmployees, type ImportResult } from "@/repos/import";
import { parseRoster, type RosterPreview } from "@/lib/import-parse";

export type AddResult = { ok: true } | { ok: false; error: string };
export type ImportActionResult = { ok: true; result: ImportResult } | { ok: false; error: string };
export type PreviewActionResult = { ok: true; preview: RosterPreview; csv: string } | { ok: false; error: string };

async function csvFromForm(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (file && typeof file !== "string") return (file as File).text();
  return String(formData.get("csv") ?? "");
}

export async function addEmployee(formData: FormData): Promise<AddResult> {
  try {
    const session = await getSession();
    await createWorker(session, {
      fullName: String(formData.get("full_name") ?? ""),
      email: (String(formData.get("email") ?? "").trim() || null),
      title: String(formData.get("title") ?? "Employee"),
      departmentId: (String(formData.get("department_id") ?? "").trim() || null),
      locationId: (String(formData.get("location_id") ?? "").trim() || null),
      hiredOn: String(formData.get("hired_on") ?? new Date().toISOString().slice(0, 10)),
      salary: Number(formData.get("salary") ?? 0) || 0,
    });
    revalidatePath("/people");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add employee." };
  }
}

/** Parse + validate the CSV without writing anything — powers the preview step. */
export async function previewRoster(formData: FormData): Promise<PreviewActionResult> {
  try {
    const session = await getSession();
    if (session.role !== "hr_admin" && session.role !== "owner") return { ok: false, error: "Only HR Admin or Owner can import." };
    const csv = await csvFromForm(formData);
    if (!csv.trim()) return { ok: false, error: "No CSV provided." };
    const preview = parseRoster(csv);
    if (preview.error) return { ok: false, error: preview.error };
    if (preview.count === 0) return { ok: false, error: "No employee rows found — each row needs a name." };
    return { ok: true, preview, csv };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't read the CSV." };
  }
}

export async function importRoster(formData: FormData): Promise<ImportActionResult> {
  try {
    const session = await getSession();
    const csv = await csvFromForm(formData);
    if (!csv.trim()) return { ok: false, error: "No CSV provided." };

    const result = await importEmployees(session, csv);
    revalidatePath("/people");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}
