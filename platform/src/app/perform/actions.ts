"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { submitSelfReview, managerReview, hrAcknowledge, createGoal, updateGoal, submitGoal, decideGoal } from "@/repos/perf";

export type R = { ok: true } | { ok: false; error: string };
async function run(fn: () => Promise<void>): Promise<R> {
  try { await fn(); revalidatePath("/perform"); revalidatePath("/", "layout"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed." }; }
}

export async function submitSelfAction(text: string): Promise<R> { return run(async () => submitSelfReview(await getSession(), text)); }
export async function managerReviewAction(workerId: string, comment: string, rating: number): Promise<R> { return run(async () => managerReview(await getSession(), workerId, comment, rating)); }
export async function hrAckAction(workerId: string, comment: string): Promise<R> { return run(async () => hrAcknowledge(await getSession(), workerId, comment)); }

export async function createGoalAction(title: string): Promise<R> { return run(async () => createGoal(await getSession(), title)); }
export async function updateGoalAction(goalId: string, progress: number, status: string): Promise<R> { return run(async () => updateGoal(await getSession(), goalId, progress, status)); }
export async function submitGoalAction(goalId: string): Promise<R> { return run(async () => submitGoal(await getSession(), goalId)); }
export async function decideGoalAction(goalId: string, approve: boolean, comment: string): Promise<R> { return run(async () => decideGoal(await getSession(), goalId, approve, comment)); }
