// One-command client onboarding: create a new company (tenant) + its pending
// Owner, and send the Clerk sign-up invitation. The owner accepts the email,
// signs up, and NayaHR's invite-claim flow makes them Owner of the new tenant —
// no SIGNUP_ALLOWLIST edit and no manual Clerk-dashboard step.
//
//   cd platform && DATABASE_URL='<owner url>' npm run client:create -- \
//        --email owner@acme.com [--name "Acme Corp Pvt Ltd"] [--country IN]
//
// --name is optional: omit it and the owner is prompted to set their own
// company name on first login (name_confirmed=false).
import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const args = process.argv.slice(2);
const arg = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const nameArg = (arg("--name") ?? "").trim();
  const email = (arg("--email") ?? "").trim().toLowerCase();
  const country = (arg("--country") ?? "IN").trim();

  if (!email) {
    throw new Error('Usage: npm run client:create -- --email owner@company.com [--name "Company Name"] [--country IN]');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid owner email.");
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL (the owner role).");

  // If no name is given, seed a placeholder from the email and let the owner set
  // their real company name on first login.
  const companyFromEmail = (e: string) => {
    const d = (e.split("@")[1] ?? "").split(".")[0];
    return d ? d.charAt(0).toUpperCase() + d.slice(1) : "New Company";
  };
  const name = nameArg.length >= 2 ? nameArg : companyFromEmail(email);
  const nameConfirmed = nameArg.length >= 2;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Guard: the owner email must not already belong to any workspace.
  const existing = (await pool.query(`select tenant_id from app_user where lower(email) = lower($1)`, [email])).rows;
  if (existing.length) {
    await pool.end();
    throw new Error(`${email} already has ${existing.length} membership/invite record(s). Use a different email, or remove the old workspace first.`);
  }

  // name_confirmed may not exist pre-migration (0021) → insert conditionally.
  const hasFlag = ((await pool.query(
    `select 1 from information_schema.columns where table_name='tenant' and column_name='name_confirmed'`,
  )).rowCount ?? 0) > 0;

  // Create the tenant + pending Owner atomically.
  let tenantId = "";
  const c: PoolClient = await pool.connect();
  try {
    await c.query("begin");
    tenantId = (await c.query(
      hasFlag
        ? `insert into tenant (name, country, name_confirmed) values ($1, $2, $3) returning id`
        : `insert into tenant (name, country) values ($1, $2) returning id`,
      hasFlag ? [name, country, nameConfirmed] : [name, country],
    )).rows[0].id;
    await c.query(`insert into app_user (tenant_id, email, role) values ($1, $2, 'owner')`, [tenantId, email]);
    await c.query(
      `insert into audit_log (tenant_id, action, entity, entity_id, after) values ($1, 'client_create', 'tenant', $1, $2::jsonb)`,
      [tenantId, JSON.stringify({ name, email })],
    );
    await c.query("commit");
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }

  console.log(`\n✓ Created workspace "${name}"  (tenant ${tenantId})`);
  console.log(`  Pending owner: ${email}`);
  if (!nameConfirmed) console.log(`  (placeholder name — ${email} will be prompted to set the real company name on first login.)`);

  // Send the Clerk sign-up invitation.
  const sk = process.env.CLERK_SECRET_KEY;
  const appUrl = process.env.APP_URL ?? "https://app.nayahr.in";
  if (!sk) {
    console.log(`\n⚠ CLERK_SECRET_KEY not set — invitation NOT sent. Invite ${email} from the Clerk dashboard (redirect ${appUrl}/sign-up).`);
  } else {
    try {
      const res = await fetch("https://api.clerk.com/v1/invitations", {
        method: "POST",
        headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email_address: email, redirect_url: `${appUrl}/sign-up`, ignore_existing: true, notify: true }),
      });
      if (res.ok) {
        console.log(`✓ Clerk invitation sent to ${email}.`);
      } else {
        console.log(`⚠ Clerk invite not sent (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}\n  Send it manually from the Clerk dashboard.`);
      }
    } catch (e) {
      console.log(`⚠ Clerk invite failed: ${e instanceof Error ? e.message : e}. Send it manually from the Clerk dashboard.`);
    }
  }

  await pool.end();
  console.log(`\nDone. When ${email} accepts and signs up, they become Owner of "${name}".`);
}

main().catch((e) => { console.error("Error:", e instanceof Error ? e.message : e); process.exit(1); });
