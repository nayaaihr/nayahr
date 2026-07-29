# Runbook — move the Prod database to Neon Mumbai (ap-south-1)

Neon can't change a project's region, so this creates a **new Mumbai project** and migrates the data into it, then repoints the app. Method: **dump-and-restore** (or Neon's **Import Data Assistant**, the guided equivalent). Small DB + few clients ⇒ a short maintenance window is acceptable; logical replication (near-zero downtime) is overkill for now.

> The user runs all commands (secrets stay in your terminal). Claude only edits code/docs. Use `<placeholders>` for URLs/passwords.

## Before you start
- Upgrade the Neon **org to Launch** (paid) — enables 7-day PITR + disabling scale-to-zero.
- Pick a low-traffic window. Expect the app to be briefly read-only / down during the cutover.
- Have ready: the **current Prod (Singapore) owner** connection string, and (after step 1) the **new Mumbai owner** string.
- `pg_dump`/`pg_restore` installed locally (comes with the `postgresql` client; `psql --version` to check).

## Step 1 — Create the Mumbai project
1. Neon console → **New Project** → Region = **AWS Asia Pacific (Mumbai) ap-south-1**. Name e.g. `nayahr-prod-mumbai`.
2. Copy its **owner** connection string (both the **pooled** `-pooler` host and the **direct** host — direct is needed for migrations/restore).
3. Create the app role (same as the Singapore setup) via the Neon SQL editor on the new project:
   ```sql
   create role nayahr_app with login password '<STRONG_PASSWORD>' nobypassrls;
   ```
   (Grants come from migration `0015` in the next step.)

## Step 2 — Build the schema in Mumbai (from our migrations)
Point at the **new Mumbai owner (direct)** URL and rebuild the schema deterministically from version control:
```bash
DATABASE_URL='<MUMBAI_OWNER_DIRECT>' npm run db:migrate     # empty DB → runs 0000..0022 (0000's drops are no-ops here)
DATABASE_URL='<MUMBAI_OWNER_DIRECT>' npm run db:apply -- --baseline
DATABASE_URL='<MUMBAI_OWNER_DIRECT>' npm run schema:check    # expect all ✓ incl. nayahr_app role + ledger
```
This recreates tables, **RLS policies + FORCE**, the `nayahr_app` grants (0015), and the `admin_tenant_summary` function (0022) — all identical to Prod.

## Step 3 — Copy the data (maintenance window starts)
Stop writes (put up a maintenance note / pause the app, or just accept a brief window). Then copy **data only** from Singapore → Mumbai as the owner (owner bypasses RLS, so all tenants' rows load):
```bash
pg_dump --data-only --no-owner --disable-triggers \
  "<SINGAPORE_OWNER_DIRECT>" \
  | psql "<MUMBAI_OWNER_DIRECT>"
```
- If `--disable-triggers` is rejected on Neon, instead do a **full** dump/restore into a *fresh empty* Mumbai project (skip step 2) — a full restore orders tables/constraints/data correctly on its own. Or use Neon's **Import Data Assistant**, which handles this for you.
- Sanity-check row counts match, e.g. `select count(*) from worker;` on both.

## Step 4 — Verify Mumbai before cutover
```bash
DATABASE_URL='<MUMBAI_OWNER_DIRECT>' npm run schema:check    # all ✓
DATABASE_URL='<MUMBAI_OWNER_DIRECT>' npm run rls:verify      # 10/10 isolation checks pass
DATABASE_URL='<MUMBAI_OWNER_DIRECT>' npm run clients:list    # tenants + counts look right
```
Do **not** proceed until RLS verify is 10/10 (proves `nayahr_app` can't bypass RLS in the new project).

## Step 5 — Cut over (repoint the app)
In the **platform** Vercel project → Environment Variables → **Production**:
- `APP_DATABASE_URL` → Mumbai **`nayahr_app` pooled** string
- `DATABASE_URL` → Mumbai **owner** string (migrations/scripts)
Then **redeploy**. Smoke-test `https://app.nayahr.in`: sign in, open People, open a payslip, run `curl -s https://app.nayahr.in/api/health` (expect `db:up`, and much lower `ms` now that DB + functions are both in Mumbai).

## Step 6 — Clean up
- Keep the Singapore project **paused, not deleted, for a few days** as a fallback.
- Update local `.env`? No — `.env` is **Dev** (Sydney), leave it. Only Prod (Vercel) moves.
- Once confident, delete the old Singapore Prod project. Enable/disable **scale-to-zero** on Mumbai per your cost/latency preference (disabling removes cold-start lag).

## Rollback
Cutover is just env vars → **instant revert**: set `APP_DATABASE_URL`/`DATABASE_URL` back to Singapore + redeploy. That's why we keep Singapore alive until verified. (Any writes made to Mumbai after cutover would not be on Singapore — so only roll back promptly if the cutover smoke-test fails.)

## Notes
- This does **not** touch Clerk, Vercel, or DNS — only the database location changes.
- Dev (Sydney) is unaffected; you can migrate it later the same way if you want Dev in Mumbai too (not required).
