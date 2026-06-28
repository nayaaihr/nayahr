"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const ALLOWED = ["owner", "hr_admin", "manager", "employee"];

/** Dev-only: set the acting role via a cookie so the in-app switcher works
 *  without restarting the server. No-op in production. */
export async function setDevRole(role: string): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  if (!ALLOWED.includes(role)) return;
  cookies().set("dev_role", role, { path: "/", sameSite: "lax", httpOnly: false });
  revalidatePath("/", "layout");
}
