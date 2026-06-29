"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { setCompanyLogo } from "@/repos/company";

export type R = { ok: true } | { ok: false; error: string };

export async function setCompanyLogoAction(dataUrl: string | null): Promise<R> {
  try {
    await setCompanyLogo(await getSession(), dataUrl);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}
