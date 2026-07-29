import { currentUser } from "@clerk/nextjs/server";

/** The configured super-admin allowlist (lowercased). Empty ⇒ feature off. */
export function superAdminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Pure check — is this email a platform super-admin? (No network call.) */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return superAdminEmails().includes(email.toLowerCase());
}

/** Standalone check that does its own Clerk lookup — used at the `/admin`
 *  boundary (page + repo) for defense in depth. On the hot path, prefer the
 *  `session.isSuperAdmin` flag (computed once in getSession) to avoid a second
 *  Clerk round-trip. */
export async function isSuperAdmin(): Promise<boolean> {
  if (superAdminEmails().length === 0) return false;
  try {
    const u = await currentUser();
    if (!u) return false;
    return u.emailAddresses.some((e) => isSuperAdminEmail(e.emailAddress));
  } catch {
    return false;
  }
}
