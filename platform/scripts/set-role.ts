// Set a user's role (owner | hr_admin | manager | employee) by email. Operator
// tool for fixing access — e.g. making the founder the Owner. Runs as the DB
// owner (DATABASE_URL). Shows the account(s) first; audited.
//
//   DATABASE_URL='<owner>' npm run set-role -- --email you@co.com --role owner
//   (if the email exists in more than one company, add --tenant <uuid>)
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const ROLES = ["owner", "hr_admin", "manager", "employee"];
const args = process.argv.slice(2);
const arg = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

async function main() {
  const email = (arg("--email") ?? "").trim().toLowerCase();
  const role = (arg("--role") ?? "").trim();
  const tenant = arg("--tenant");
  if (!email || !role) throw new Error('Usage: npm run set-role -- --email you@co.com --role owner|hr_admin|manager|employee');
  if (!ROLES.includes(role)) throw new Error(`--role must be one of: ${ROLES.join(", ")}`);
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL (owner role).");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const rows = (await pool.query(
    `select u.id, u.tenant_id, t.name as tenant, u.role, u.worker_id
     from app_user u left join tenant t on t.id = u.tenant_id
     where lower(u.email) = lower($1)`, [email])).rows;
  if (!rows.length) { await pool.end(); throw new Error(`No account found for ${email}.`); }

  console.log(`\nAccounts for ${email}:`);
  rows.forEach((r) => console.log(`  role=${String(r.role).padEnd(9)} tenant=${JSON.stringify(r.tenant)} [${r.tenant_id}]  worker=${r.worker_id ?? "(none)"}`));

  let targets = rows;
  if (rows.length > 1) {
    if (!tenant) { await pool.end(); throw new Error(`Multiple accounts for ${email} — add --tenant <uuid> to pick which company.`); }
    targets = rows.filter((r) => r.tenant_id === tenant);
    if (!targets.length) { await pool.end(); throw new Error(`No ${email} account in tenant ${tenant}.`); }
  }

  for (const t of targets) {
    if (t.role === role) { console.log(`  (already '${role}' in ${JSON.stringify(t.tenant)} — no change)`); continue; }
    await pool.query(`update app_user set role = $1 where id = $2`, [role, t.id]);
    await pool.query(
      `insert into audit_log (tenant_id, action, entity, entity_id, before, after) values ($1, 'set_role', 'app_user', $2, $3::jsonb, $4::jsonb)`,
      [t.tenant_id, t.id, JSON.stringify({ role: t.role }), JSON.stringify({ role })]);
    console.log(`  ✓ ${email} in ${JSON.stringify(t.tenant)} → '${role}'`);
  }
  await pool.end();
  console.log(`\nDone. Have them sign out and back in for the new role to take effect.`);
}
main().catch((e) => { console.error("Error:", e instanceof Error ? e.message : e); process.exit(1); });
