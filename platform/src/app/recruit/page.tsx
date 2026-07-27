import { getSession } from "@/lib/session";
import { listRecruitment } from "@/repos/recruit";
import { NewReq } from "./new-req";
import { CandidateActions } from "./candidate-actions";
import { ReqActionsMenu } from "./req-menu";
import { AddCandidate } from "./add-candidate";

export const dynamic = "force-dynamic";

const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
const lakh = (n: number | null) => (n ? "₹" + (n / 100000).toFixed(1) + "L" : "—");
function stagePill(s: string) {
  const c = s === "Hired" ? "green" : s === "Rejected" ? "red" : s === "Offer" || s === "Interview" ? "amber" : "";
  return <span className={"pill " + c}>{s}</span>;
}
function reqStatusPill(s: string) {
  const c =
    s === "Open" ? "green"
    : s === "Pending approval" || s === "On hold" ? "amber"
    : s === "Rejected" ? "red"
    : ""; // Filled, Closed → neutral
  return <span className={"pill " + c}>{s}</span>;
}

export default async function RecruitPage() {
  const session = await getSession();
  const { reqs, cands, canManage, canCreate } = await listRecruitment(session);

  const openReqs = reqs.filter((r) => r.status === "Open").length;
  const pendingReqs = reqs.filter((r) => r.status === "Pending approval").length;
  const inPipeline = cands.filter((c) => c.stage !== "Hired" && c.stage !== "Rejected").length;
  const offers = cands.filter((c) => c.stage === "Offer").length;
  const hired = cands.filter((c) => c.stage === "Hired").length;
  const showReqActions = canManage; // actions column: approve pending, share open

  return (
    <main>
      <div className="top">
        <div>
          <h1>Recruitment</h1>
          <div className="sub">Requisitions &amp; candidate pipeline · viewing as <strong>{session.role}</strong></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {canCreate && <NewReq canApprove={canManage} />}
        </div>
      </div>

      <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat"><div className="lbl">Open requisitions</div><div className="val">{openReqs}</div><div className="sub2">{reqs.reduce((s, r) => s + (r.status === "Open" ? r.openings : 0), 0)} positions</div></div>
        <div className="stat"><div className="lbl">{canManage ? "Pending approval" : "In pipeline"}</div><div className="val">{canManage ? pendingReqs : inPipeline}</div><div className="sub2">{canManage ? "awaiting HR sign-off" : "active candidates"}</div></div>
        <div className="stat"><div className="lbl">Offers out</div><div className="val">{offers}</div><div className="sub2">awaiting response</div></div>
        <div className="stat"><div className="lbl">Hired</div><div className="val">{hired}</div><div className="sub2">this period</div></div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hd">Requisitions{canManage && pendingReqs > 0 && <span className="badge">{pendingReqs} pending approval</span>}</div>
        <table>
          <thead><tr><th>Role</th><th>Dept</th><th>Location</th><th>Openings</th><th>Candidates</th><th>Status</th></tr></thead>
          <tbody>
            {reqs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No requisitions.</td></tr>
            ) : reqs.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>
                  {r.title}
                  {r.description && <div style={{ fontWeight: 400, fontSize: 11.5, color: "var(--muted)", marginTop: 2, maxWidth: 320, whiteSpace: "normal", lineHeight: 1.4 }}>{r.description}</div>}
                </td>
                <td>{r.department ? <span className="pill">{r.department}</span> : "—"}</td>
                <td>{r.location ?? "—"}</td>
                <td>
                  {r.openings}
                  {r.openings > 1 && (
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ display: "inline-block", width: 54, height: 5, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round((r.hired / r.openings) * 100))}%`, background: r.hired >= r.openings ? "var(--green)" : "var(--brand)" }} />
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{r.hired} of {r.openings} filled</span>
                    </div>
                  )}
                </td>
                <td>{r.candidates}</td>
                <td>
                  <span style={{ display: "inline-flex", gap: 10, alignItems: "center", justifyContent: "space-between", minWidth: showReqActions ? 150 : undefined, width: "100%" }}>
                    {reqStatusPill(r.status)}
                    {showReqActions && <ReqActionsMenu reqId={r.id} title={r.title} status={r.status} />}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Candidate pipeline{canManage && <span className="badge">{inPipeline} active</span>}</span>
          {canCreate && <AddCandidate reqs={reqs.filter((r) => r.status === "Open").map((r) => ({ id: r.id, title: r.title }))} />}
        </div>
        <table>
          <thead><tr><th>Candidate</th><th>Requisition</th><th>Stage</th><th style={{ textAlign: "right" }}>Offer (CTC)</th></tr></thead>
          <tbody>
            {cands.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No candidates yet — add one to start the pipeline.</td></tr>
            ) : cands.map((c) => (
              <tr key={c.id}>
                <td><span className="av">{initials(c.name)}</span>{c.name}</td>
                <td>{c.req_title}</td>
                <td>
                  <span style={{ display: "inline-flex", gap: 10, alignItems: "center", justifyContent: "space-between", minWidth: canManage ? 140 : undefined, width: "100%" }}>
                    {stagePill(c.stage)}
                    {canManage && <CandidateActions id={c.id} stage={c.stage} name={c.name} offerAmount={c.offer_amount} />}
                  </span>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: c.offer_amount ? 600 : 400, color: c.offer_amount ? undefined : "var(--muted)" }}>{lakh(c.offer_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
