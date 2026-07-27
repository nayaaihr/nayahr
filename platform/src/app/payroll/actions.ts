"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createRun, finalizeRun, deleteRun } from "@/repos/payroll";

export type R = { ok: true } | { ok: false; error: string };

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
