"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RowMenu } from "@/app/row-menu";
import { advanceAction, rejectAction, hireAction, type R } from "./actions";

/** Per-candidate actions (kebab dropdown next to the stage pill): Advance /
 *  Hire → Core HR, and Reject. Terminal stages show nothing. */
export function CandidateActions({ id, stage }: { id: string; stage: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<R>) => start(async () => {
    const res = await fn();
    if (res.ok) router.refresh(); else alert(res.error);
  });

  if (stage === "Hired" || stage === "Rejected") return null; // terminal — the stage pill says it all

  return (
    <RowMenu disabled={pending}>
      {(close) => (
        <>
          {stage === "Offer"
            ? <button className="rowmenu-item" role="menuitem" onClick={() => { close(); run(() => hireAction(id)); }}>Hire → Core HR</button>
            : <button className="rowmenu-item" role="menuitem" onClick={() => { close(); run(() => advanceAction(id)); }}>Advance to next stage</button>}
          <button className="rowmenu-item danger" role="menuitem" onClick={() => { close(); run(() => rejectAction(id)); }}>Reject candidate</button>
        </>
      )}
    </RowMenu>
  );
}
