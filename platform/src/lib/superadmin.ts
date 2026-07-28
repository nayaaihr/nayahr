import { currentUser } from "@clerk/nextjs/server";

/** True if the signed-in user is a NayaHR platform super-admin (provider staff),
 *  determined by the SUPERADMIN_EMAILS allowlist (comma-separated). This is
 *  orthogonal to tenant roles — a super-admin manages the platform, not a tenant.
 *  Empty/unset allowlist ⇒ nobody is a super-admin (feature is off). */
export async function isSuperAdmin(): Promise<boolean> {
  const allow = (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allow.length === 0) return false;
  try {
    const u = await currentUser();
    if (!u) return false;
    return u.emailAddresses.some((e) => allow.includes(e.emailAddress.toLowerCase()));
  } catch {
    return false;
  }
}
