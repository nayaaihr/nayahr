import { getSession } from "@/lib/session";
import { listRecruitment } from "@/repos/recruit";
import { NewReq } from "./new-req";
import { CandidateActions } from "./candidate-actions";
import { ReqDecision } from "./req-actions";
import { AddCandidate } from "./add-candidate";

export const dynamic = "force-dynamic";

const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
function stagePill(s: string) {
  const c = s === "Hired" ? "green" : s === "Rejected" ? "red" : s === "Offer" || s === "Interview" ? "amber" : "";
  return <span className={"pill " + c}>{s}</span>;
}
function reqStatusPill(s: string) {
  const c = s === "Open" ? "green" : s === "Pending approval" || s === "On hold" ? "amber" : "";
  return <span className={"pill " + c}>{s}</span>;
}
const stars = (n: number | null) => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "—");

export default async function RecruitPage() {
  const session = await getSession();
  const { reqs, cands, canManage, canCreate } = await listRecruitment(session);

  const openReqs = reqs.filter((r) => r.status === "Open").length;
  const pendingReqs = reqs.filter((r) => r.status === "Pending approval").length;
  const inPipeline = cands.filter((c) => c.stage !== "Hired" && c.stage !== "Rejected").length;
  const offers = cands.filter((c) => c.stage === "Offer").length;
  const hired = cands.filter((c) => c.stage === "Hired").length;
  const showReqActions = canManage && pendingReqs > 0;

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
        <div className="panel-hd">Requisitions{showReqActions && <span className="badge">{pendingReqs} pending approval</span>}</div>
        <table>
          <thead><tr><th>Role</th><th>Dept</th><th>Location</th><th>Openings</th><th>Candidates</th><th>Status</th>{showReqActions && <th></th>}</tr></thead>
          <tbody>
            {reqs.length === 0 ? (
              <tr><td colSpan={showReqActions ? 7 : 6} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No requisitions.</td></tr>
            ) : reqs.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.title}</td>
                <td>{r.department ? <span className="pill">{r.department}</span> : "—"}</td>
                <td>{r.location ?? "—"}</td>
                <td>{r.openings}</td>
                <td>{r.candidates}</td>
                <td>{reqStatusPill(r.status)}</td>
                {showReqActions && <td style={{ textAlign: "right" }}>{r.status === "Pending approval" && <ReqDecision reqId={r.id} />}</td>}
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
          <thead><tr><th>Candidate</th><th>Requisition</th><th>Stage</th><th>Rating</th>{canManage && <th>Action</th>}</tr></thead>
          <tbody>
            {cands.length === 0 ? (
              <tr><td colSpan={canManage ? 5 : 4} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No candidates yet — add one to start the pipeline.</td></tr>
            ) : cands.map((c) => (
              <tr key={c.id}>
                <td><span className="av">{initials(c.name)}</span>{c.name}</td>
                <td>{c.req_title}</td>
                <td>{stagePill(c.stage)}</td>
                <td style={{ color: "#e0a912", whiteSpace: "nowrap" }}>{stars(c.rating)}</td>
                {canManage && <td><CandidateActions id={c.id} stage={c.stage} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
