"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RowMenu } from "@/app/row-menu";
import { decideReqAction, closeReqAction, deleteReqAction, type R } from "./actions";

/** Per-requisition actions (kebab dropdown next to the status pill): folds
 *  Approve/Reject, Share, Close and Delete into one menu. */
export function ReqActionsMenu({ reqId, title, status }: { reqId: string; title: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<R>) => start(async () => {
    const r = await fn();
    if (r.ok) router.refresh(); else alert(r.error);
  });

  const publicUrl = () => `${window.location.origin}/jobs/${reqId}`;
  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl())}`, "_blank", "noopener,noreferrer,width=620,height=680");
  };
  const copyLink = async () => {
    const url = publicUrl();
    try { await navigator.clipboard.writeText(url); alert(`Public job link copied:\n${url}`); }
    catch { prompt("Public job link — copy it:", url); }
  };
  const openLink = () => window.open(publicUrl(), "_blank", "noopener,noreferrer");
  const del = () => {
    if (!confirm(`Delete the "${title}" requisition and its candidate list?\n\nThis can't be undone. Anyone already hired stays an employee.`)) return;
    run(() => deleteReqAction(reqId));
  };

  const isPending = status === "Pending approval";
  const isOpen = status === "Open";
  const canClose = isOpen || isPending || status === "On hold";

  return (
    <RowMenu disabled={pending}>
      {(close) => (
        <>
          {isPending && <button className="rowmenu-item" role="menuitem" onClick={() => { close(); run(() => decideReqAction(reqId, true)); }}>Approve</button>}
          {isPending && <button className="rowmenu-item" role="menuitem" onClick={() => { close(); run(() => decideReqAction(reqId, false)); }}>Reject</button>}
          {isOpen && <button className="rowmenu-item" role="menuitem" onClick={() => { close(); copyLink(); }}>Copy public link</button>}
          {isOpen && <button className="rowmenu-item" role="menuitem" onClick={() => { close(); openLink(); }}>View public page</button>}
          {isOpen && <button className="rowmenu-item" role="menuitem" onClick={() => { close(); shareLinkedIn(); }}>Share on LinkedIn</button>}
          {canClose && <button className="rowmenu-item" role="menuitem" onClick={() => { close(); run(() => closeReqAction(reqId)); }}>Close requisition</button>}
          <button className="rowmenu-item danger" role="menuitem" onClick={() => { close(); del(); }}>Delete requisition</button>
        </>
      )}
    </RowMenu>
  );
}
