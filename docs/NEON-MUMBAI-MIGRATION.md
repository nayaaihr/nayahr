# Runbook — move the Prod database to Neon Mumbai (ap-south-1)

**Status: parked for a dedicated session.** Neon can't change a project's region, so this creates a **new Mumbai project** and migrates the data into it, then repoints the app. Method: **dump-and-restore** per Neon's guide (a full custom-format `pg_dump | pg_restore` pipe). Small DB + few clients ⇒ a short maintenance window is fine; logical replication (near-zero downtime) is overkill for now.

**Neon references (read these at run time):**
- Region migration overview — https://neon.com/docs/import/region-migration
- Migrate to another region — https://neon.com/docs/import/migrate-neon-to-another-region
- Neon→Neon dump/restore (the exact command) — https://neon.com/docs/import/migrate-from-neon

> The user runs all commands (secrets stay in your terminal); Claude only edits code/docs. Use `<placeholders>` for URLs/passwords. Do this in a **fresh terminal** and read the `target DB:` line before any write.

## Before you start
- Upgrade the Neon **org to Launch** (paid) — enables 7-day PITR + disabling scale-to-zero.
- Pick a low-traffic window; the app is briefly read-only / down during cutover.
- Get **unpooled (direct)** connection strings for **both** projects via the **Connect** button. ⚠️ Neon: *"Avoid `pg_dump` over a pooled connection string — use an unpooled one."*
- Ensure your local `pg_dump`/`pg_restore` version is **≥ the Neon Postgres version** (else the dump errors). Check `pg_dump --version`.

## Step 1 — Create the Mumbai project
1. Neon console → **New Project** → Region = **AWS Asia Pacific (Mumbai) ap-south-1**. Name e.g. `nayahr-prod-mumbai`.
2. Copy its connection strings: the **owner unpooled** (for the restore + migrations) and the **`nayahr_app` pooled** (for the app, step 5). The owner is `neondb_owner`, same as Singapore — so ownership maps across cleanly.

## Step 2 — Create the app role in Mumbai (before the restore)
Roles do NOT travel in a dump, but the dump contains `GRANT … TO nayahr_app`. Create the role first so those grants apply. In the Neon SQL editor on the new project:
```sql
create role nayahr_app with login password '<STRONG_PASSWORD>' nobypassrls;
```

## Step 3 — Dump + restore (maintenance window starts)
Stop writes (maintenance note / pause the app, or accept a brief window). Then run Neon's documented one-liner with **unpooled** URLs — this copies **schema + RLS policies + grants + data + the `schema_migrations` ledger** in one pass:
```bash
pg_dump -Fc -v -d '<SINGAPORE_OWNER_UNPOOLED>' | pg_restore -v -d '<MUMBAI_OWNER_UNPOOLED>'
```
- `-Fc` custom-format archive · `-v` verbose. Runs as the owner (which bypasses RLS), so every tenant's rows load.
- Grants to `nayahr_app` succeed because the role now exists (step 2). The `admin_tenant_summary` SECURITY DEFINER function restores owned by the Mumbai owner, so it keeps working.
- _(Alternative: Neon's **Import Data Assistant** in the console does this guided — use it if you prefer clicking through.)_

## Step 4 — Verify Mumbai BEFORE cutover
```bash
DATABASE_URL='<MUMBAI_OWNER_UNPOOLED>' npm run schema:check   # all ✓, ledger lists all 23 (came across in the dump)
DATABASE_URL='<MUMBAI_OWNER_UNPOOLED>' npm run rls:verify     # MUST be 10/10 (proves nayahr_app can't bypass RLS)
DATABASE_URL='<MUMBAI_OWNER_UNPOOLED>' npm run clients:list   # tenants + employee counts match Singapore
```
Spot-check a row count too, e.g. `select count(*) from worker;` on both. **Do not cut over unless `rls:verify` is 10/10.**

## Step 5 — Cut over (repoint the app)
In the **platform** Vercel project → Environment Variables → **Production**:
- `APP_DATABASE_URL` → Mumbai **`nayahr_app` pooled** string
- `DATABASE_URL` → Mumbai **owner** string
Then **redeploy**. Smoke-test `https://app.nayahr.in`: sign in, open People, open a payslip; `curl -s https://app.nayahr.in/api/health` should show `db:up` with a much lower `ms` (DB + functions both in Mumbai now).

## Step 6 — Clean up
- Keep the Singapore project **paused, not deleted, for a few days** (rollback safety net).
- Leave local `.env` alone — that's **Dev** (Sydney); only Prod (Vercel) moves.
- Once confident, delete the old Singapore project. Set **scale-to-zero** on Mumbai per cost/latency preference (disabling removes cold-start lag).

## Rollback
Cutover is just env vars → **instant revert**: point `APP_DATABASE_URL`/`DATABASE_URL` back at Singapore + redeploy. Roll back **promptly** if the smoke-test fails — any writes made to Mumbai after cutover won't exist on Singapore. That's why Singapore stays alive until verified.

## Notes
- Touches **only the database location** — not Clerk, Vercel, or DNS.
- Dev (Sydney) is unaffected; migrate it later the same way if you ever want Dev in Mumbai (not required).
