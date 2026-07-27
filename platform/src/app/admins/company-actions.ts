"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { setCompanyName } from "@/repos/company";

export type R = { ok: true } | { ok: false; error: string };

export async function setCompanyNameAction(name: string): Promise<R> {
  try {
    await setCompanyName(await getSession(), name);
    revalidatePath("/", "layout"); // updates sidebar branding + payslips everywhere
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't rename the company." };
  }
}
