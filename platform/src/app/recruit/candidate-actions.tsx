"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceAction, rejectAction, hireAction, type R } from "./actions";

export function CandidateActions({ id, stage }: { id: string; stage: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (fn: () => Promise<R>) => start(async () => {
    const res = await fn();
    if (res.ok) router.refresh(); else alert(res.error);
  });

  if (stage === "Hired" || stage === "Rejected") return <span style={{ color: "var(--muted)" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      {stage === "Offer"
        ? <button className="btn sm" disabled={pending} onClick={() => go(() => hireAction(id))}>Hire → Core HR</button>
        : <button className="btn sm" disabled={pending} onClick={() => go(() => advanceAction(id))}>Advance ›</button>}
      <button className="btn ghost sm" disabled={pending} onClick={() => go(() => rejectAction(id))}>Reject</button>
    </span>
  );
}
