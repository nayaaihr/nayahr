"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideReqAction, closeReqAction, deleteReqAction, type R } from "./actions";

/** Compact per-row actions menu for a requisition (kebab dropdown next to the
 *  status pill). Folds Approve/Reject, Share, Close and Delete into one menu.
 *  Rendered with fixed positioning so the scrollable panel doesn't clip it. */
export function ReqActionsMenu({ reqId, title, status }: { reqId: string; title: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [pending, start] = useTransition();
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const MENU_W = 210;
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: Math.max(8, r.right - MENU_W) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onMove = () => setOpen(false); // reposition-on-scroll is fiddly; just close
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const act = (fn: () => Promise<R>) => {
    setOpen(false);
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh(); else alert(r.error);
    });
  };

  const shareLinkedIn = () => {
    setOpen(false);
    const url = `${window.location.origin}/jobs/${reqId}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer,width=620,height=680");
  };
  const del = () => {
    setOpen(false);
    if (!confirm(`Delete the "${title}" requisition and its candidate list?\n\nThis can't be undone. Anyone already hired stays an employee.`)) return;
    start(async () => {
      const r = await deleteReqAction(reqId);
      if (r.ok) router.refresh(); else alert(r.error);
    });
  };

  const isPending = status === "Pending approval";
  const isOpen = status === "Open";
  const canClose = isOpen || isPending || status === "On hold";

  return (
    <>
      <button
        ref={btnRef}
        className="rowmenu-btn"
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Actions"
        onClick={toggle}
      >
        ⋯
      </button>
      {open && (
        <div ref={popRef} className="rowmenu-pop" role="menu" style={{ top: pos.top, left: pos.left, width: MENU_W }}>
          {isPending && <button className="rowmenu-item" role="menuitem" onClick={() => act(() => decideReqAction(reqId, true))}>Approve</button>}
          {isPending && <button className="rowmenu-item" role="menuitem" onClick={() => act(() => decideReqAction(reqId, false))}>Reject</button>}
          {isOpen && <button className="rowmenu-item" role="menuitem" onClick={shareLinkedIn}>Share on LinkedIn</button>}
          {canClose && <button className="rowmenu-item" role="menuitem" onClick={() => act(() => closeReqAction(reqId))}>Close requisition</button>}
          <button className="rowmenu-item danger" role="menuitem" onClick={del}>Delete requisition</button>
        </div>
      )}
    </>
  );
}
