// Applies sql/*.sql in order. Run against a fresh dev DB: `npm run db:migrate`.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (.env)");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const dir = join(process.cwd(), "sql");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    process.stdout.write(`  applying ${f} … `);
    await pool.query(readFileSync(join(dir, f), "utf8"));
    console.log("ok");
  }
  await pool.end();
  console.log("Migration complete.");
}
main().catch((e) => { console.error(e); process.exit(1); });
