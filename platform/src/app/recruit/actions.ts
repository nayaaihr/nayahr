"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createRequisition, decideRequisition, addCandidate, moveCandidate, setCandidateStage, hireCandidate } from "@/repos/recruit";

export type R = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<R> {
  try { await fn(); revalidatePath("/recruit"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed." }; }
}

export async function createReqAction(fd: FormData): Promise<R> {
  return run(async () => {
    const s = await getSession();
    await createRequisition(s, {
      title: String(fd.get("title") ?? ""),
      department: String(fd.get("department") ?? "").trim() || null,
      location: String(fd.get("location") ?? "").trim() || null,
      openings: Number(fd.get("openings") ?? 1) || 1,
      description: String(fd.get("description") ?? "").trim() || null,
    });
  });
}
export async function decideReqAction(reqId: string, approve: boolean): Promise<R> { return run(async () => decideRequisition(await getSession(), reqId, approve)); }
export async function addCandidateAction(fd: FormData): Promise<R> {
  return run(async () => {
    await addCandidate(await getSession(), {
      reqId: String(fd.get("reqId") ?? ""),
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      source: String(fd.get("source") ?? ""),
    });
  });
}
export async function advanceAction(id: string): Promise<R> { return run(async () => moveCandidate(await getSession(), id, 1)); }
export async function rejectAction(id: string): Promise<R> { return run(async () => setCandidateStage(await getSession(), id, "Rejected")); }
export async function hireAction(id: string): Promise<R> { return run(async () => hireCandidate(await getSession(), id)); }
