import Link from "next/link";
import { getSession } from "@/lib/session";
import { getWorkerDetail } from "@/repos/worker-detail";
import { listPeople, listRefData } from "@/repos/people";
import { SalaryStructure, CompHistory } from "@/app/comp/comp-detail";
import { EditJob } from "./edit-job";

export const dynamic = "force-dynamic";

const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
const inr = (n: string | null) => (!n ? "—" : "₹" + (Number(n) / 100000).toFixed(1) + "L");
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const tenure = (d: string) => ((Date.now() - new Date(d).getTime()) / 3.156e10).toFixed(1) + "y";
const statusPill = (s: string) => <span className={"pill " + (s === "Active" ? "green" : s === "On leave" ? "amber" : "red")}>{s}</span>;
const leavePill = (s: string) => <span className={"pill " + (s === "Approved" ? "green" : s === "Rejected" ? "red" : "amber")}>{s}</span>;
const goalPill = (s: string) => <span className={"pill " + (s === "Done" ? "green" : s === "At risk" ? "red" : "")}>{s}</span>;

export default async function WorkerPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const d = await getWorkerDetail(session, params.id);

  if (!d) {
    return (
      <main>
        <div className="top"><div><h1>Employee</h1><div className="sub"><Link href="/people">← People</Link></div></div></div>
        <div className="empty-cta"><h2>Not found</h2><p>This employee doesn&apos;t exist or isn&apos;t in your view.</p></div>
      </main>
    );
  }
  const p = d.person;
  const ref = d.canEdit ? await listRefData(session) : { departments: [], locations: [] };
  const people = d.canEdit ? (await listPeople(session)).map((x) => ({ id: x.worker_id, name: x.full_name })) : [];

  return (
    <main>
      <div className="top">
        <div>
          <div className="sub" style={{ marginBottom: 6 }}><Link href="/people">← People</Link></div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="av" style={{ width: 40, height: 40, fontSize: 15 }}>{p.photo_url ? <img src={p.photo_url} alt="" /> : initials(p.full_name)}</span>
            {p.full_name}
          </h1>
          <div className="sub">{p.title}{p.department ? ` · ${p.department}` : ""}{p.location ? ` · ${p.location}` : ""} · {statusPill(p.employment_status)}</div>
        </div>
        {d.canEdit && (
          <EditJob
            workerId={p.worker_id}
            current={{ title: p.title, department: p.department, location: p.location, managerId: p.manager_id, status: p.employment_status }}
            departments={ref.departments} locations={ref.locations} people={people}
          />
        )}
      </div>

      {/* Core HR */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hd">Core HR</div>
        <div className="statrow" style={{ gridTemplateColumns: "repeat(4, 1fr)", padding: 18 }}>
          <div className="stat"><div className="lbl">Email</div><div className="val" style={{ fontSize: 14, marginTop: 14 }}>{p.email ?? "—"}</div></div>
          <div className="stat"><div className="lbl">Manager</div><div className="val" style={{ fontSize: 15, marginTop: 14 }}>{p.manager_name ?? "—"}</div></div>
          <div className="stat"><div className="lbl">Hired</div><div className="val" style={{ fontSize: 15, marginTop: 14 }}>{fmt(p.hired_on)}</div><div className="sub2">{tenure(p.hired_on)} tenure</div></div>
          <div className="stat"><div className="lbl">Salary</div><div className="val">{inr(p.salary)}</div></div>
        </div>
        <div className="panel-hd" style={{ borderTop: "1px solid var(--line-2)" }}>Job history (effective-dated)</div>
        <table>
          <thead><tr><th>Effective</th><th>Event</th><th>Title</th><th>Department</th><th>Location</th><th>Manager</th><th>Status</th></tr></thead>
          <tbody>
            {d.jobHistory.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>No history.</td></tr>
            ) : d.jobHistory.map((j, i) => (
              <tr key={i}>
                <td>{fmt(j.effective_date)}{i === 0 && <span className="pill green" style={{ marginLeft: 8 }}>current</span>}</td>
                <td>{j.event_type}</td><td>{j.title}</td><td>{j.department ?? "—"}</td><td>{j.location ?? "—"}</td><td>{j.manager ?? "—"}</td><td>{statusPill(j.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compensation */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hd">Compensation</div>
        {p.salary ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div><div className="panel-hd" style={{ borderTop: "1px solid var(--line-2)" }}>Salary structure (annual CTC)</div><SalaryStructure annual={Number(p.salary)} /></div>
            <div><div className="panel-hd" style={{ borderTop: "1px solid var(--line-2)" }}>Change history</div><div style={{ padding: "0 16px 12px" }}><CompHistory history={d.comp} /></div></div>
          </div>
        ) : <div style={{ padding: 22, color: "var(--muted)" }}>No compensation on file.</div>}
      </div>

      {/* Time off */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hd">Time off</div>
        <div className="statrow" style={{ gridTemplateColumns: "repeat(3, 1fr)", padding: 18 }}>
          {d.balances.map((b) => (
            <div className="stat" key={b.type}><div className="lbl">{b.type}</div><div className="val">{b.remaining}</div><div className="sub2">{b.used} used · of {b.allowance}</div></div>
          ))}
        </div>
        <table>
          <thead><tr><th>Type</th><th>From</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>
            {d.leave.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>No leave requests.</td></tr>
            ) : d.leave.map((l) => (
              <tr key={l.id}><td>{l.type}</td><td>{fmt(l.from_date)}</td><td>{l.days}</td><td>{leavePill(l.status)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance */}
      <div className="panel">
        <div className="panel-hd">Performance</div>
        <div className="statrow" style={{ padding: 18 }}>
          <div className="stat"><div className="lbl">Review stage</div><div className="val" style={{ fontSize: 16, marginTop: 14 }}>{d.review?.stage ?? "—"}</div></div>
          <div className="stat"><div className="lbl">Rating</div><div className="val" style={{ color: "#e0a912", marginTop: 12 }}>{d.review?.rating ? "★".repeat(d.review.rating) : "—"}</div></div>
          <div className="stat"><div className="lbl">Goals</div><div className="val">{d.goals.length}</div></div>
        </div>
        {d.goals.length > 0 && (
          <div style={{ padding: "0 22px 18px" }}>
            {d.goals.map((g, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{g.title}</span>{goalPill(g.status)}</div>
                <div className="rangebar"><div className="rangefill" style={{ width: g.progress + "%", background: g.status === "At risk" ? "var(--red)" : g.status === "Done" ? "var(--green)" : undefined }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
