import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listAdmins } from "@/repos/admins";
import { getCompany } from "@/repos/company";
import { AdminRowActions, GrantAdmin } from "./admin-actions";
import { CompanyName } from "./company-name";

export const dynamic = "force-dynamic";

const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

export default async function AdminsPage() {
  const session = await getSession();
  if (session.role !== "owner") redirect("/"); // Owner-only screen

  const [{ admins, grantable }, company] = await Promise.all([listAdmins(session), getCompany(session)]);

  return (
    <main>
      <div className="top">
        <div>
          <h1>Administrators</h1>
          <div className="sub">Who can run HR in <strong>{company.name}</strong> · Owner only</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hd">Company</div>
        <CompanyName current={company.name} />
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hd">Administrators<span className="badge">{admins.length}</span></div>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Access</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>
                  <span className="av">{initials(a.name ?? a.email)}</span>
                  {a.name ?? "—"}
                  {a.isSelf && <span className="pill" style={{ marginLeft: 8 }}>You</span>}
                </td>
                <td>{a.email}</td>
                <td>
                  {a.role === "owner"
                    ? <span className="pill green">Owner</span>
                    : <span className="pill">HR Admin</span>}
                </td>
                <td>{a.active ? <span className="pill green">Active</span> : <span className="pill amber">Invited</span>}</td>
                <td style={{ textAlign: "right" }}>
                  {a.role === "hr_admin"
                    ? <AdminRowActions appUserId={a.id} name={a.name ?? a.email} />
                    : <span style={{ color: "var(--muted)" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-hd">Grant admin access</div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="sub" style={{ fontSize: 13.5, color: "var(--muted)", maxWidth: 620 }}>
            Promote an existing member to <strong>HR Admin</strong> so they can manage people, hiring, pay, and approvals.
            To make someone the account Owner instead, use <strong>Make owner</strong> on their row above.
          </div>
          <GrantAdmin options={grantable} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd">What each role can do</div>
        <div style={{ padding: "18px 22px", display: "grid", gap: 14, fontSize: 13.5, lineHeight: 1.55 }}>
          <div>
            <div style={{ fontWeight: 650, marginBottom: 2 }}>Owner <span className="pill green" style={{ marginLeft: 6 }}>1 person</span></div>
            <div style={{ color: "var(--muted)" }}>The account owner — usually the business owner. Everything an HR Admin can do, plus managing administrators and transferring ownership. There is always exactly one Owner, and only the Owner sees this screen.</div>
          </div>
          <div>
            <div style={{ fontWeight: 650, marginBottom: 2 }}>HR Admin</div>
            <div style={{ color: "var(--muted)" }}>Runs day-to-day HR — people records, recruitment, performance, compensation, time off, and all approvals across the company.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
