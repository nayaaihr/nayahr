"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteAction, resendInviteAction } from "./invite-action";

export function InviteCell({ workerId, status }: { workerId: string; status: "active" | "invited" | "none" }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: true; emailed: boolean; note?: string } | { ok: false; error: string }>, sentMsg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) { alert(r.error); return; }
      alert(r.note ?? (r.emailed ? sentMsg : "Done."));
      router.refresh();
    });

  if (status === "active") return <span className="pill green">Portal active</span>;
  if (status === "invited") return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span className="pill amber">Invited</span>
      <button className="btn ghost sm" disabled={pending} onClick={() => run(() => resendInviteAction(workerId), "Invitation resent.")}>
        {pending ? "Resending…" : "Resend"}
      </button>
    </span>
  );
  return (
    <button className="btn ghost sm" disabled={pending} onClick={() => run(() => inviteAction(workerId), "Invitation email sent.")}>
      {pending ? "Inviting…" : "Invite"}
    </button>
  );
}
