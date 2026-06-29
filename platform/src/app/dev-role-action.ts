"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const ALLOWED = ["owner", "hr_admin", "manager", "employee"];

/** Set the acting role via a cookie. Whether it's honored is enforced in
 *  getSession (dev: any role; production: only a real Owner, downgrade only),
 *  so setting the cookie as a non-owner in production has no effect. */
export async function setDevRole(role: string): Promise<void> {
  if (!ALLOWED.includes(role)) return;
  cookies().set("dev_role", role, { path: "/", sameSite: "lax", httpOnly: false });
  revalidatePath("/", "layout");
}
