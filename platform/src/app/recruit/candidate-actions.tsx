"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RowMenu } from "@/app/row-menu";
import { advanceAction, rejectAction, makeOfferAction, hireAction, type R } from "./actions";
import { rupee } from "@/lib/salary";

const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired"];

/** Per-candidate actions (kebab next to the stage pill). Advancing names the next
 *  stage; the Interview→Offer and Offer→Hire steps capture/confirm the salary,
 *  which becomes the employee's compensation on hire. */
export function CandidateActions({ id, stage, name, offerAmount }: { id: string; stage: string; name: string; offerAmount: number | null }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "offer" | "hire">(null);
  const [amount, setAmount] = useState(offerAmount ? String(offerAmount) : "");

  const run = (fn: () => Promise<R>) => start(async () => {
    const r = await fn();
    if (r.ok) { setDialog(null); router.refresh(); } else alert(r.error);
  });

  if (stage === "Hired" || stage === "Rejected") return null;

  const next = STAGES[STAGES.indexOf(stage) + 1];
  const openDialog = (mode: "offer" | "hire") => { setAmount(offerAmount ? String(offerAmount) : ""); setDialog(mode); };
  const submit = () => {
    const n = Number(amount);
    if (!(n > 0)) { alert("Enter a valid annual salary."); return; }
    run(() => (dialog === "offer" ? makeOfferAction(id, n) : hireAction(id, n)));
  };

  return (
    <>
      <RowMenu disabled={pending}>
        {(close) => (
          <>
            {stage === "Interview" ? (
              <button className="rowmenu-item" role="menuitem" onClick={() => { close(); openDialog("offer"); }}>Make offer…</button>
            ) : stage === "Offer" ? (
              <button className="rowmenu-item" role="menuitem" onClick={() => { close(); openDialog("hire"); }}>Hire → Core HR…</button>
            ) : next && next !== "Hired" ? (
              <button className="rowmenu-item" role="menuitem" onClick={() => { close(); run(() => advanceAction(id)); }}>Advance to {next}</button>
            ) : null}
            <button className="rowmenu-item danger" role="menuitem" onClick={() => { close(); run(() => rejectAction(id)); }}>Reject candidate</button>
          </>
        )}
      </RowMenu>

      {dialog && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="modal" style={{ maxWidth: 420, textAlign: "left" }}>
            <div className="modal-hd">
              <h3>{dialog === "offer" ? "Make offer" : "Hire"} — {name}</h3>
              <button className="x" onClick={() => setDialog(null)} aria-label="Close">×</button>
            </div>
            <div className="modal-bd">
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Annual salary (CTC)</label>
              <input type="number" min={0} step={10000} value={amount} autoFocus placeholder="e.g. 1200000" onChange={(e) => setAmount(e.target.value)} />
              {Number(amount) > 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>{rupee(Number(amount))}/year · ≈ {rupee(Number(amount) / 12)}/month</div>}
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
                {dialog === "offer"
                  ? "Records the offered salary and moves the candidate to Offer. It pre-fills at hire."
                  : "This becomes the employee's compensation and flows into Core HR & payroll on hire."}
              </p>
            </div>
            <div className="modal-ft">
              <button className="btn ghost" onClick={() => setDialog(null)} disabled={pending}>Cancel</button>
              <button className="btn" onClick={submit} disabled={pending}>{pending ? "Saving…" : dialog === "offer" ? "Make offer" : "Confirm hire"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
