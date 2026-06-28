"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { requestLeave, decideLeave } from "@/repos/leave";

export type LeaveResult = { ok: true } | { ok: false; error: string };

export async function requestLeaveAction(formData: FormData): Promise<LeaveResult> {
  try {
    const session = await getSession();
    await requestLeave(session, {
      type: String(formData.get("type") ?? "Annual"),
      fromDate: String(formData.get("from_date") ?? new Date().toISOString().slice(0, 10)),
      days: Number(formData.get("days") ?? 1) || 1,
    });
    revalidatePath("/leave");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to submit request." };
  }
}

export async function decideLeaveAction(leaveId: string, status: "Approved" | "Rejected"): Promise<LeaveResult> {
  try {
    const session = await getSession();
    await decideLeave(session, leaveId, status);
    revalidatePath("/leave");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update request." };
  }
}
