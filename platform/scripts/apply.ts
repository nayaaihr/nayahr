// Apply a SINGLE sql file (additive prod migration), e.g.:
//   npm run db:apply -- sql/0003_leave.sql
// Unlike `db:migrate` (which runs 0000's destructive drops for dev resets),
// this applies just the file you name — safe against a populated database.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run db:apply -- sql/000X_name.sql");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (.env)");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  process.stdout.write(`  applying ${file} … `);
  await pool.query(readFileSync(file, "utf8"));
  console.log("ok");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
