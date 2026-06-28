import { getSession } from "@/lib/session";
import { listPeople, listRefData } from "@/repos/people";
import { listAccess } from "@/repos/access";
import { AddEmployee } from "./add-employee";
import { ImportRoster } from "./import-roster";
import { InviteCell } from "./invite-button";

export const dynamic = "force-dynamic"; // read live from the DB each request

function inr(n: string | null) {
  if (!n) return "—";
  return "₹" + (Number(n) / 100000).toFixed(1) + "L";
}
function initials(name: string) {
  return name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
}
function tenure(hiredOn: string) {
  return ((Date.now() - new Date(hiredOn).getTime()) / 3.156e10).toFixed(1) + "y";
}

export default async function PeoplePage() {
  const session = await getSession();
  const people = await listPeople(session);
  const today = new Date().toISOString().slice(0, 10);
  const canAdd = session.role === "hr_admin" || session.role === "owner";
  const ref = canAdd ? await listRefData(session) : { departments: [], locations: [] };
  const access = canAdd ? await listAccess(session) : new Map();

  return (
    <main>
      <div className="top">
        <div>
          <h1>People (Core HR)</h1>
          <div className="sub">
            Effective-dated · as of {today} · {people.length} people · viewing as{" "}
            <strong>{session.role}</strong>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="badge">Postgres + RLS</span>
          {canAdd && people.length > 0 && <ImportRoster />}
          {canAdd && <AddEmployee departments={ref.departments} locations={ref.locations} />}
        </div>
      </div>

      {canAdd && people.length === 0 ? (
        <div className="empty-cta">
          <h2>Welcome — let's add your team</h2>
          <p>Your company is set up. Import your roster from a spreadsheet to get started in minutes, or add people one at a time.</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "18px" }}>
            <ImportRoster variant="cta" />
            <AddEmployee departments={ref.departments} locations={ref.locations} />
          </div>
        </div>
      ) : (
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Title</th><th>Manager</th><th>Department</th><th>Location</th><th>Status</th><th>Tenure</th><th>Salary</th>{canAdd && <th>Portal access</th>}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.worker_id}>
                <td>
                  <span className="av">{p.photo_url ? <img src={p.photo_url} alt="" /> : initials(p.full_name)}</span>
                  {p.full_name}
                </td>
                <td>{p.title}</td>
                <td style={{ color: p.manager_name ? undefined : "var(--muted)" }}>{p.manager_name ?? "—"}</td>
                <td><span className="pill">{p.department}</span></td>
                <td>{p.location}</td>
                <td>
                  <span className={"pill " + (p.employment_status === "Active" ? "green" : "red")}>
                    {p.employment_status}
                  </span>
                </td>
                <td style={{ color: "var(--muted)" }}>{tenure(p.hired_on)}</td>
                <td>{inr(p.salary)}</td>
                {canAdd && <td><InviteCell workerId={p.worker_id} status={access.get(p.worker_id) ?? "none"} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <p className="note">
        This view reads live from Postgres through the effective-dated query (latest{" "}
        <code>job_event</code> + <code>compensation_event</code> as of today). Tenant isolation is
        enforced by Row-Level Security; the row set is scoped to your role
        (<code>{session.role}</code>). Switch persona by setting <code>DEV_ROLE</code> to{" "}
        <code>manager</code> or <code>employee</code> and reloading. JSON: <code>/api/people</code>.
      </p>
    </main>
  );
}
