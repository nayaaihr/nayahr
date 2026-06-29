"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { decideLeave } from "@/repos/leave";
import { decideRequisition } from "@/repos/recruit";
import { decideCompChange } from "@/repos/comp";
import { hrAcknowledge } from "@/repos/perf";
import { decideJobChange } from "@/repos/worker-detail";

export type R = { ok: true } | { ok: false; error: string };

/** Approve/reject an inbox item inline, dispatching to the right module repo
 *  (each enforces RBAC + audit). `approve=true` also covers HR review acknowledge. */
export async function inboxDecideAction(kind: string, id: string, approve: boolean): Promise<R> {
  try {
    const s = await getSession();
    if (kind === "leave") await decideLeave(s, id, approve ? "Approved" : "Rejected");
    else if (kind === "requisition") await decideRequisition(s, id, approve);
    else if (kind === "comp") await decideCompChange(s, id, approve);
    else if (kind === "jobchange") await decideJobChange(s, id, approve);
    else if (kind === "review") await hrAcknowledge(s, id, ""); // acknowledge only
    else throw new Error("Unknown action.");
    revalidatePath("/inbox");
    revalidatePath("/", "layout"); // refresh the nav badge count
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}
