"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createWorker } from "@/repos/people-write";
import { importEmployees, type ImportResult } from "@/repos/import";

export type AddResult = { ok: true } | { ok: false; error: string };
export type ImportActionResult = { ok: true; result: ImportResult } | { ok: false; error: string };

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

export async function importRoster(formData: FormData): Promise<ImportActionResult> {
  try {
    const session = await getSession();
    const file = formData.get("file");
    let csv = "";
    if (file && typeof file !== "string") csv = await (file as File).text();
    else csv = String(formData.get("csv") ?? "");
    if (!csv.trim()) return { ok: false, error: "No CSV provided." };

    const result = await importEmployees(session, csv);
    revalidatePath("/people");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}
