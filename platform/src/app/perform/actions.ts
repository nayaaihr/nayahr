"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { submitSelfReview, managerReview, hrAcknowledge } from "@/repos/perf";

export type R = { ok: true } | { ok: false; error: string };
async function run(fn: () => Promise<void>): Promise<R> {
  try { await fn(); revalidatePath("/perform"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed." }; }
}

export async function submitSelfAction(text: string): Promise<R> { return run(async () => submitSelfReview(await getSession(), text)); }
export async function managerReviewAction(workerId: string, comment: string, rating: number): Promise<R> { return run(async () => managerReview(await getSession(), workerId, comment, rating)); }
export async function hrAckAction(workerId: string, comment: string): Promise<R> { return run(async () => hrAcknowledge(await getSession(), workerId, comment)); }
