"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { setMyAvatar } from "@/repos/profile";

export type R = { ok: true } | { ok: false; error: string };

export async function setAvatarAction(dataUrl: string | null): Promise<R> {
  try {
    await setMyAvatar(await getSession(), dataUrl);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}
