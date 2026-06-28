"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideReqAction } from "./actions";

export function ReqDecision({ reqId }: { reqId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (approve: boolean) => start(async () => {
    const r = await decideReqAction(reqId, approve);
    if (r.ok) router.refresh(); else alert(r.error);
  });
  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn sm" disabled={pending} onClick={() => go(true)}>Approve</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => go(false)}>Reject</button>
    </span>
  );
}
