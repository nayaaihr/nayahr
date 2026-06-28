"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Review } from "@/repos/perf";
import { submitSelfAction, managerReviewAction, hrAckAction, type R } from "./actions";

const STEP_ORDER = ["Self-review", "Manager review", "HR review", "Closed"];
function stagePill(stage: string) {
  const c = stage === "Closed" ? "green" : stage === "HR review" ? "amber" : stage === "Manager review" ? "amber" : "";
  return <span className={"pill " + c}>{stage}</span>;
}
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} title={`${n}`}
          style={{ background: "none", border: 0, cursor: "pointer", padding: 0, fontSize: 24, lineHeight: 1, color: value >= n ? "#e0a912" : "#d6d6dc" }}>★</button>
      ))}
    </span>
  );
}
const stars = (n: number | null) => (n ? <span style={{ color: "#e0a912", fontSize: 16 }}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span> : <span style={{ color: "var(--muted)" }}>not rated</span>);
const Done = () => <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>;
const Wait = () => <span style={{ color: "#c9a227" }}>●</span>;
const Idle = () => <span style={{ color: "#cfcfd6" }}>○</span>;

function stepIcon(step: string, stage: string) {
  const si = STEP_ORDER.indexOf(step), cur = STEP_ORDER.indexOf(stage);
  if (cur > si) return <Done />;
  if (cur === si) return <Wait />;
  return <Idle />;
}

export function ReviewButton({ review, role, selfId }: { review: Review; role: string; selfId: string | null }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [selfText, setSelfText] = useState(review.self_text ?? "");
  const [mgrComment, setMgrComment] = useState(review.manager_comment ?? "");
  const [rating, setRating] = useState(review.rating ?? 0);
  const [hrComment, setHrComment] = useState(review.hr_comment ?? "");

  const isSelf = review.worker_id === selfId;
  const isManager = role === "manager" || role === "hr_admin" || role === "owner";
  const isHR = role === "hr_admin" || role === "owner";
  const canSubmitSelf = isSelf && review.stage === "Self-review";
  const canManagerReview = isManager && !isSelf && review.stage === "Manager review";
  const canHrAck = isHR && review.stage === "HR review";
  const actionable = canSubmitSelf || canManagerReview || canHrAck;

  const go = (fn: () => Promise<R>) => { setErr(null); start(async () => { const res = await fn(); if (res.ok) { setOpen(false); router.refresh(); } else setErr(res.error); }); };

  return (
    <>
      <button className={"btn sm " + (actionable ? "" : "ghost")} onClick={() => { setErr(null); setOpen(true); }}>
        {canSubmitSelf ? "Write self-review" : canManagerReview ? "Review →" : canHrAck ? "Acknowledge" : "View"}
      </button>
      {open && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-hd">
              <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>{review.name} {stagePill(review.stage)}</h3>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-bd" style={{ maxHeight: "70vh", overflow: "auto" }}>
              {err && <div className="err">{err}</div>}

              {/* Step 1 — Self-assessment */}
              <section style={{ marginBottom: 22 }}>
                <div className="rv-step">{stepIcon("Self-review", review.stage)} <strong>1 · Self-assessment</strong> <span className="rv-by">employee</span></div>
                {canSubmitSelf ? (
                  <>
                    <textarea rows={5} value={selfText} onChange={(e) => setSelfText(e.target.value)} placeholder="Summarise your impact this cycle, key wins, and where you want to grow…" />
                    <div style={{ marginTop: 10 }}>
                      <button className="btn" disabled={pending} onClick={() => go(() => submitSelfAction(selfText))}>{pending ? "Submitting…" : "Submit to manager"}</button>
                    </div>
                  </>
                ) : review.self_text ? <p className="rv-text">{review.self_text}</p> : <p className="rv-muted">Not submitted yet.</p>}
              </section>

              {/* Step 2 — Manager review */}
              <section style={{ marginBottom: 22 }}>
                <div className="rv-step">{stepIcon("Manager review", review.stage)} <strong>2 · Manager review</strong> <span className="rv-by">manager</span></div>
                {canManagerReview ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 10px" }}>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>Rating</span><StarPicker value={rating} onChange={setRating} />
                    </div>
                    <textarea rows={4} value={mgrComment} onChange={(e) => setMgrComment(e.target.value)} placeholder="Your assessment, strengths, and development areas…" />
                    <div style={{ marginTop: 10 }}>
                      <button className="btn" disabled={pending} onClick={() => go(() => managerReviewAction(review.worker_id, mgrComment, rating))}>{pending ? "Submitting…" : "Approve & send to HR"}</button>
                    </div>
                  </>
                ) : review.manager_comment || review.rating ? (
                  <><div style={{ marginBottom: 6 }}>{stars(review.rating)}</div>{review.manager_comment && <p className="rv-text">{review.manager_comment}</p>}</>
                ) : <p className="rv-muted">{review.stage === "Self-review" ? "Waiting on the employee's self-review." : "Awaiting manager review."}</p>}
              </section>

              {/* Step 3 — HR review */}
              <section>
                <div className="rv-step">{stepIcon("HR review", review.stage)} <strong>3 · HR review</strong> <span className="rv-by">HR admin</span></div>
                {canHrAck ? (
                  <>
                    <textarea rows={3} value={hrComment} onChange={(e) => setHrComment(e.target.value)} placeholder="Optional note (calibration, follow-ups)…" />
                    <div style={{ marginTop: 10 }}>
                      <button className="btn" disabled={pending} onClick={() => go(() => hrAckAction(review.worker_id, hrComment))}>{pending ? "Closing…" : "Acknowledge & close"}</button>
                    </div>
                  </>
                ) : review.hr_status === "Acknowledged" ? (
                  <><p style={{ color: "var(--green)", fontWeight: 600, margin: "2px 0 6px" }}>Acknowledged & closed</p>{review.hr_comment && <p className="rv-text">{review.hr_comment}</p>}</>
                ) : <p className="rv-muted">Awaiting HR acknowledgement.</p>}
              </section>
            </div>
            <div className="modal-ft"><button type="button" className="btn ghost" onClick={() => setOpen(false)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}
