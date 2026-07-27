"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { grantAdmin, revokeAdmin, transferOwnership } from "@/repos/admins";

export type R = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<R> {
  try {
    await fn();
    revalidatePath("/admins");
    revalidatePath("/", "layout"); // role change can affect the current user's own nav
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function grantAdminAction(appUserId: string): Promise<R> {
  return run(async () => grantAdmin(await getSession(), appUserId));
}
export async function revokeAdminAction(appUserId: string): Promise<R> {
  return run(async () => revokeAdmin(await getSession(), appUserId));
}
export async function transferOwnershipAction(appUserId: string): Promise<R> {
  return run(async () => transferOwnership(await getSession(), appUserId));
}
