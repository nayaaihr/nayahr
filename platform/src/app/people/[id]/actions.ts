"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { changeJob, updatePayrollDetails } from "@/repos/worker-detail";

export type R = { ok: true; emailChanged: boolean } | { ok: false; error: string };
export type SaveR = { ok: true } | { ok: false; error: string };

export async function savePayrollDetailsAction(workerId: string, fd: FormData): Promise<SaveR> {
  try {
    await updatePayrollDetails(await getSession(), workerId, {
      bankAccount: String(fd.get("bankAccount") ?? ""),
      bankIfsc: String(fd.get("bankIfsc") ?? ""),
      upiId: String(fd.get("upiId") ?? ""),
      pan: String(fd.get("pan") ?? ""),
      uan: String(fd.get("uan") ?? ""),
    });
    revalidatePath(`/people/${workerId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save." };
  }
}

export async function changeJobAction(workerId: string, fd: FormData): Promise<R> {
  try {
    const { emailChanged } = await changeJob(await getSession(), workerId, {
      effectiveDate: String(fd.get("effectiveDate") ?? ""),
      title: String(fd.get("title") ?? ""),
      departmentId: String(fd.get("departmentId") ?? "") || null,
      locationId: String(fd.get("locationId") ?? "") || null,
      managerId: String(fd.get("managerId") ?? "") || null,
      status: String(fd.get("status") ?? "Active"),
      email: String(fd.get("email") ?? "").trim() || null,
    });
    revalidatePath(`/people/${workerId}`);
    revalidatePath("/people");
    return { ok: true, emailChanged };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}
