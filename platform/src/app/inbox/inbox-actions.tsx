"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { inboxDecideAction } from "./actions";

export function InboxActions({ kind, id, action }: { kind: string; id: string; action: "approve_reject" | "acknowledge" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (approve: boolean) => start(async () => {
    const r = await inboxDecideAction(kind, id, approve);
    if (r.ok) router.refresh(); else alert(r.error);
  });

  if (action === "acknowledge") {
    return <button className="btn sm" disabled={pending} onClick={() => go(true)}>{pending ? "…" : "Acknowledge"}</button>;
  }
  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn sm" disabled={pending} onClick={() => go(true)}>Approve</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => go(false)}>Reject</button>
    </span>
  );
}
