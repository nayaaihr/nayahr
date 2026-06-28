"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { requestCompChange, decideCompChange } from "@/repos/comp";

export type R = { ok: true } | { ok: false; error: string };
async function run(fn: () => Promise<void>): Promise<R> {
  try { await fn(); revalidatePath("/comp"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed." }; }
}

export async function requestCompAction(fd: FormData): Promise<R> {
  return run(async () => {
    await requestCompChange(await getSession(), {
      workerId: String(fd.get("workerId") ?? ""),
      newAmount: Number(fd.get("newAmount") ?? 0),
      effectiveDate: String(fd.get("effectiveDate") ?? ""),
      reason: String(fd.get("reason") ?? ""),
    });
  });
}
export async function decideCompAction(reqId: string, approve: boolean): Promise<R> {
  return run(async () => decideCompChange(await getSession(), reqId, approve));
}
