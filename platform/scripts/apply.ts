// Apply a SINGLE sql file (additive prod migration) and RECORD it in a migration
// ledger (schema_migrations), so each database tracks what's been applied.
//
//   npm run db:apply -- sql/0003_leave.sql   # apply + record (skips if already applied)
//   npm run db:apply -- sql/0003_leave.sql --force   # re-run even if recorded
//   npm run db:apply -- --status             # list applied vs pending migrations
//   npm run db:apply -- --baseline           # record ALL sql files as applied WITHOUT running
//                                            #   (adopt the ledger on a DB that already has them)
//
// Unlike `db:migrate` (which runs 0000's destructive drops for dev resets), this
// applies just the file you name — safe against a populated database. Run as the
// owner role (DATABASE_URL).
import { readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const SQL_DIR = "sql";

async function ensureLedger(pool: Pool) {
  await pool.query(`create table if not exists schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )`);
}

const migrationFiles = (): string[] => readdirSync(SQL_DIR).filter((f) => f.endsWith(".sql")).sort();

async function appliedVersions(pool: Pool): Promise<Set<string>> {
  const r = await pool.query<{ version: string }>(`select version from schema_migrations`);
  return new Set(r.rows.map((x) => x.version));
}

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error("Usage: npm run db:apply -- sql/000X_name.sql | --status | --baseline");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (owner role).");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await ensureLedger(pool);

  if (arg === "--status") {
    const applied = await appliedVersions(pool);
    const files = migrationFiles();
    console.log(`\nMigrations — ${applied.size}/${files.length} recorded as applied:\n`);
    for (const f of files) console.log(`  ${applied.has(f) ? "✓ applied " : "· pending "}  ${f}`);
    console.log("");
    await pool.end();
    return;
  }

  if (arg === "--baseline") {
    const files = migrationFiles();
    for (const f of files) await pool.query(`insert into schema_migrations (version) values ($1) on conflict do nothing`, [f]);
    console.log(`Baseline: recorded ${files.length} migration file(s) as applied (did NOT run them).`);
    console.log(`Use this only on a DB that already has these migrations. Verify with 'npm run schema:check'.`);
    await pool.end();
    return;
  }

  // Apply a single file.
  const version = basename(arg);
  const force = process.argv.includes("--force");
  const applied = await appliedVersions(pool);
  if (applied.has(version) && !force) {
    console.log(`  ${version} already applied (per ledger) — skipping. Add --force to re-run.`);
    await pool.end();
    return;
  }

  process.stdout.write(`  applying ${version} … `);
  await pool.query(readFileSync(arg, "utf8"));
  await pool.query(`insert into schema_migrations (version) values ($1) on conflict do nothing`, [version]);
  console.log("ok (recorded)");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
