# NayaHR — project orientation for Claude

**NayaHR** is an AI-native HRIS for **Indian SMBs (10–200 employees)**, live in production. This file is the quick-start context for any new session. For the deep history, see `BACKLOG.md`, `LAUNCH-CHECKLIST.md`, and the recall memory.

_Last updated: 2026-07-28._

## What it is
Multi-tenant SaaS. Modules shipped & live: **Core HR** (effective-dated), **Recruitment**, **Performance** (+ review workflow), **Compensation**, **Time & Leave**, **Reporting**, **Inbox** (approvals), **Payroll** (statutory PF/ESI/PT/TDS, payslips, bank/UPI export, statutory summary, reopen/regenerate), an **AI assistant** (role-scoped read+write), and a provider **super-admin console** (`/admin`).

## Stack & repo layout
- **`platform/`** — the app (`app.nayahr.in`). Next.js 14.2 App Router · TypeScript · Postgres on **Neon** · **Drizzle** ORM · **Clerk** auth · Anthropic **Claude** AI. Deployed as its own Vercel project (root dir `platform/`).
- **`marketing/`** — static site (`nayahr.in`): `index.html` + generated `privacy.html`/`terms.html`/`dpa.html` + `vercel.json` (cleanUrls). Separate Vercel project (root dir `marketing/`).
- **`legal/`** — source-of-truth legal Markdown + generators (`build_web.py`, `build_pdfs.py`) + PDFs.
- Root docs: `BACKLOG.md` (NH-### items), `LAUNCH-CHECKLIST.md`, onboarding/pricing/architecture decks.
- **Two Vercel projects, one GitHub repo** (`github.com/nayaaihr/nayahr`, private, branch `main`). An **Ignored Build Step** (`git diff --quiet HEAD^ HEAD ./`) means root-level `.md`/`.pdf` commits don't trigger app/marketing deploys — only changes under the project's own dir do.

## Architecture essentials
- **Multi-tenancy = Postgres Row-Level Security (FORCE RLS).** The app connects as role **`nayahr_app`** which **cannot bypass RLS** (`APP_DATABASE_URL`). The **owner** role (`DATABASE_URL`) is for migrations/operator scripts only. `withSession(session, fn)` in `src/db/client.ts` sets `app.tenant`/`app.user`/`app.role` GUCs per transaction; every repo query runs through it and is auto-scoped. **Never** add a code path that bypasses RLS for tenant data. (Cross-tenant super-admin reads go through a `SECURITY DEFINER` function, `admin_tenant_summary()`, gated by `SUPERADMIN_EMAILS`.)
- **Effective-dated data:** append-only `job_event` / `compensation_event` (effective_date + seq); never mutate history.
- **Invite-only:** app-level gate (`SIGNUP_ALLOWLIST`) + Clerk restricted sign-up. New clients via `npm run client:create`; owners can also self-provision. New/unnamed tenants prompt the owner to set their company name (`tenant.name_confirmed`).
- **Roles:** Owner / HR Admin / Manager / Employee (+ platform super-admin via `SUPERADMIN_EMAILS`, orthogonal to tenant roles).

## Working conventions (important)
- **Secrets never go in chat.** DB connection strings (with passwords), `sk_live`/`pk_live`, API keys — the **user runs all prod commands themselves** with the value supplied inline in their own terminal. Claude writes scripts and command templates using `<placeholder>` values only.
- **Migrations:** additive SQL files in `platform/sql/`. Apply one with `npm run db:apply -- sql/00XX_name.sql` — this now **records to a `schema_migrations` ledger** (skips if already applied; `--force` re-runs). `npm run db:status` lists applied vs pending; `npm run schema:check` probes which key objects actually exist (run against Dev + Prod to spot drift); `db:apply -- --baseline` adopts the ledger on a DB that already has everything. Prod migrations are run **manually by the user** with the prod **owner** `DATABASE_URL` inline, **before** the dependent code is relied on. `db:migrate` is dev-only (destructive: 0000 drops). Currently through **0022**. App reads that touch a new column should degrade gracefully (try/catch) so a deploy-before-migrate window doesn't 500.
- **Operator scripts** (run as owner via `DATABASE_URL`, dry-run/read-only by default): `rls:verify`, `schema:check`, `db:status`, `client:create`, `inspect:user`, `clients:list`, `db:cleanup`, `payroll:delete-run`, `set-role`.
- **Tests:** `npm test` (Vitest) — payroll math, roster parsing, payout, CSV. Keep these green.
- **Legal docs:** edit `legal/*.md`, then `npm run legal:build` regenerates the marketing pages + PDFs.
- **Git:** work on `main` (that's what this project uses); commit/push when the user asks. End commit messages with the `Co-Authored-By: Claude ...` trailer.
- **Verify from mobile/desktop yourself** (browser tools / screenshots) rather than asking the user to check, when practical.

## Key env vars (platform, in Vercel)
`APP_DATABASE_URL` (nayahr_app, app runtime) · `DATABASE_URL` (owner, migrations) · Clerk `pk_live`/`sk_live` · `ANTHROPIC_API_KEY` · `APP_URL` · `PG_POOL_MAX` · `SIGNUP_ALLOWLIST` · `NEXT_PUBLIC_SENTRY_DSN`(+`SENTRY_DSN`) · `SUPERADMIN_EMAILS`.

## Company & contacts
**NayaHR Private Limited**, Pune, Maharashtra. Grievance Officer: **Charu Tripathi**, hello@nayahr.in. Data residency target: Neon **Mumbai** (migration pending). Monitoring: Sentry (EU) + `/api/health`.

## Current state (2026-07-28)
Engineering, tests, monitoring, and legal *plumbing* are done. **Remaining launch blockers are business/infra (user-owned):** ToS/Privacy lawyer review, Neon paid + Mumbai region + verified backups, Vercel Pro.

## Current initiative → **PWA (mobile app)**
Next build: a **mobile-responsive, installable PWA** focused on **employee self-service** (payslips, leave apply/approve, inbox approvals, profile). See **`docs/PWA-PLAN.md`** for the scope and phased plan. Keep admin-heavy flows (payroll runs, recruitment, super-admin) web/desktop.
