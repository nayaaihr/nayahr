"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { getSession } from "@/lib/session";
import { inviteEmployee } from "@/repos/access";

export type R = { ok: true; emailed: boolean; note?: string } | { ok: false; error: string };

function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const h = headers();
  const host = h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
  return "http://localhost:3000";
}

/** Send a real Clerk sign-up invitation email. Best-effort: the DB invite is the
 *  source of truth (claim-on-sign-in still works), so a send failure isn't fatal. */
async function sendClerkInvite(email: string): Promise<{ emailed: boolean; note?: string }> {
  try {
    const cc = await clerkClient();
    await cc.invitations.createInvitation({ emailAddress: email, redirectUrl: appUrl(), ignoreExisting: true });
    return { emailed: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Already-has-account / already-invited are expected & harmless — claim still works.
    return { emailed: false, note: /exist|already/i.test(msg) ? "They already have an account — they'll get access on next sign-in." : "Invite saved, but the email couldn't be sent — share the app link with them." };
  }
}

export async function inviteAction(workerId: string): Promise<R> {
  try {
    const { email } = await inviteEmployee(await getSession(), workerId);
    const sent = await sendClerkInvite(email);
    revalidatePath("/people");
    return { ok: true, ...sent };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}
