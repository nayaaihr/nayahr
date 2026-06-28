"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideLeaveAction } from "./actions";

export function DecideButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function decide(status: "Approved" | "Rejected") {
    start(async () => {
      const res = await decideLeaveAction(id, status);
      if (res.ok) router.refresh();
      else alert(res.error);
    });
  }

  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn sm" disabled={pending} onClick={() => decide("Approved")}>Approve</button>
      <button className="btn ghost sm" disabled={pending} onClick={() => decide("Rejected")}>Reject</button>
    </span>
  );
}
