import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/superadmin";
import { listAllTenants } from "@/repos/admin";

export const dynamic = "force-dynamic";

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function AdminConsolePage() {
  if (!(await isSuperAdmin())) redirect("/");
  const tenants = await listAllTenants();

  return (
    <main>
      <div className="top">
        <div>
          <h1>Clients</h1>
          <div className="sub">Platform super-admin · all client workspaces</div>
        </div>
      </div>

      {tenants === null ? (
        <div className="empty-cta">
          <h2>Console not ready</h2>
          <p>Apply migration <code>0022_admin_tenant_summary.sql</code> to enable the cross-tenant summary.</p>
        </div>
      ) : (
        <>
          <div className="statrow" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="stat"><div className="lbl">Clients</div><div className="val">{tenants.length}</div></div>
            <div className="stat"><div className="lbl">Employees (all clients)</div><div className="val">{tenants.reduce((a, t) => a + t.workers, 0)}</div></div>
            <div className="stat"><div className="lbl">Active users</div><div className="val">{tenants.reduce((a, t) => a + t.active_users, 0)}</div></div>
          </div>

          <div className="panel">
            <div className="panel-hd">All client workspaces</div>
            <table>
              <thead>
                <tr>
                  <th>Company</th><th>Owner</th>
                  <th style={{ textAlign: "right" }}>Employees</th>
                  <th style={{ textAlign: "right" }}>Users</th>
                  <th>Country</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No clients yet.</td></tr>
                ) : tenants.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>
                      {t.name}
                      {!t.name_confirmed && <span className="pill amber" style={{ marginLeft: 8 }}>name not set</span>}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{t.owners ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>{t.workers}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{t.active_users}/{t.users}</td>
                    <td>{t.country}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmt(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
