"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideReqAction, closeReqAction, deleteReqAction } from "./actions";

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

/** Close (for open reqs) and Delete — HR/Owner housekeeping on a requisition. */
export function ReqManage({ reqId, title, status }: { reqId: string; title: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const canClose = status === "Open" || status === "Pending approval" || status === "On hold";

  const close = () => start(async () => {
    const r = await closeReqAction(reqId);
    if (r.ok) router.refresh(); else alert(r.error);
  });
  const del = () => {
    if (!confirm(`Delete the "${title}" requisition and its candidate list?\n\nThis can't be undone. Anyone already hired stays an employee.`)) return;
    start(async () => {
      const r = await deleteReqAction(reqId);
      if (r.ok) router.refresh(); else alert(r.error);
    });
  };

  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      {canClose && <button className="btn ghost sm" disabled={pending} onClick={close}>Close</button>}
      <button className="btn ghost sm" disabled={pending} onClick={del} style={{ color: "var(--red)" }}>Delete</button>
    </span>
  );
}
