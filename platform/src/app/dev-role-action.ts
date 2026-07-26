"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const ALLOWED = ["owner", "hr_admin", "manager", "employee"];

/** Set the acting role via a cookie. Whether it's honored is enforced in
 *  getSession (dev: any role; production: only a real Owner, downgrade only),
 *  so setting the cookie as a non-owner in production has no effect. */
export async function setDevRole(role: string): Promise<void> {
  if (!ALLOWED.includes(role)) return;
  const c = cookies();
  c.set("dev_role", role, { path: "/", sameSite: "lax", httpOnly: false });
  c.delete("view_as_worker"); // reset the chosen persona when the role changes
  revalidatePath("/", "layout");
}

/** Pick a specific worker to "view as" (the persona), set by the second dropdown. */
export async function setViewAsWorker(workerId: string): Promise<void> {
  cookies().set("view_as_worker", workerId, { path: "/", sameSite: "lax", httpOnly: false });
  revalidatePath("/", "layout");
}
