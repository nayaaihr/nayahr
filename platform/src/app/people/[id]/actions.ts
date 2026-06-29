"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { changeJob } from "@/repos/worker-detail";

export type R = { ok: true } | { ok: false; error: string };

export async function changeJobAction(workerId: string, fd: FormData): Promise<R> {
  try {
    await changeJob(await getSession(), workerId, {
      effectiveDate: String(fd.get("effectiveDate") ?? ""),
      title: String(fd.get("title") ?? ""),
      departmentId: String(fd.get("departmentId") ?? "") || null,
      locationId: String(fd.get("locationId") ?? "") || null,
      managerId: String(fd.get("managerId") ?? "") || null,
      status: String(fd.get("status") ?? "Active"),
    });
    revalidatePath(`/people/${workerId}`);
    revalidatePath("/people");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}
