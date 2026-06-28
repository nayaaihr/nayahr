"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteAction } from "./invite-action";

export function InviteCell({ workerId, status }: { workerId: string; status: "active" | "invited" | "none" }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (status === "active") return <span className="pill green">Portal active</span>;
  if (status === "invited") return <span className="pill amber">Invited</span>;
  return (
    <button className="btn ghost sm" disabled={pending}
      onClick={() => start(async () => {
        const r = await inviteAction(workerId);
        if (!r.ok) { alert(r.error); return; }
        if (r.note) alert(r.note); else if (r.emailed) alert("Invitation email sent.");
        router.refresh();
      })}>
      {pending ? "Inviting…" : "Invite"}
    </button>
  );
}
