# NayaHR Platform — backend vertical slice (NH-027)

Proves the production foundation on **one module (People / Core HR)** before porting the rest:
**API-first · effective-dated data model · tenant isolation via Postgres RLS · audit-ready · AI-same-gate.**

Stack: **Next.js (App Router) · Drizzle · Postgres (Neon) · TypeScript.** See `../ADR-001-backend-foundation.md`.

---

## What's here

```
platform/
  sql/0000_init.sql        effective-dated schema (worker, job_event, compensation_event, audit_log, …)
  sql/0001_rls.sql         FORCE row-level security + tenant-isolation policies
  scripts/migrate.ts       applies sql/*.sql in order
  src/db/schema.ts         Drizzle typed schema (in sync with the SQL)
  src/db/client.ts         pool + withSession() — sets app.tenant/user/role GUCs per transaction
  src/db/seed.ts           ~48 effective-dated workers (parity with the prototype) + 3 demo users
  src/lib/session.ts       DEV session (Clerk goes here later)
  src/repos/people.ts      the effective-dated "as of today" query, RBAC-scoped
  src/app/people/page.tsx  People view, reads live from Postgres
  src/app/api/people/route.ts  read API (the seam the AI tools will call)
```

## Setup (≈5 min)

1. **Create a Postgres DB.** [Neon](https://neon.tech) free tier — pick **AWS ap-south-1 (Mumbai)** for India data residency. Copy the connection string.
2. **Configure env:**
   ```bash
   cd platform
   cp .env.example .env
   # paste your connection string into DATABASE_URL (keep ?sslmode=require)
   ```
3. **Install + create schema + seed:**
   ```bash
   npm install
   npm run db:migrate    # applies sql/0000_init.sql then sql/0001_rls.sql
   npm run seed          # seeds a tenant; writes .dev-session.json
   ```
4. **Run:**
   ```bash
   npm run dev           # http://localhost:3000  -> /people
   ```

`npm run db:reset` re-migrates + re-seeds from scratch.

## Try the concepts

- **Effective-dated read** — the People list is computed, not stored: latest `job_event` + `compensation_event` with `effective_date <= today`. Future-dated rows would be excluded automatically.
- **RBAC scope** — set `DEV_ROLE` in `.env` and reload:
  - `hr_admin` (default) → whole org
  - `manager` → only their direct reports
  - `employee` → only themselves
- **Tenant isolation (RLS)** — every query runs inside a transaction with `app.tenant` set; the policy `tenant_id = app_tenant()` is FORCE-enabled, so even a query that "forgets" to filter by tenant cannot cross tenants. (Add a second tenant via a tweaked seed to see an `hr_admin` of tenant A get zero rows from tenant B.)
- **Read API** — `GET http://localhost:3000/api/people` returns the same RLS-scoped JSON.

## Phase 2 — Sign-in (Clerk)

Auth is now real: the app is gated behind Clerk login, and tenant/role come from the signed-in user. Setup (≈5 min):

1. **Create a Clerk app** at [clerk.com](https://clerk.com) → sign up → **Create application** (email/Google sign-in is fine).
2. On the **API Keys** page, copy the two keys.
3. Paste them into `.env` (after the `=`, don't replace the whole line):
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
   CLERK_SECRET_KEY=sk_test_…
   ```
   (Keep the `NEXT_PUBLIC_CLERK_SIGN_IN_URL` etc. lines from `.env.example`.)
4. **Re-create the DB schema** (Phase 2 added columns) and re-seed:
   ```bash
   npm run db:reset
   ```
5. Run:
   ```bash
   npm run dev      # http://localhost:3000  → redirected to /sign-in
   ```
6. **Sign up** (creates your Clerk account). You land on `/people`. Your first sign-in **claims the demo tenant as `hr_admin`**, so you see the 48 people. A user menu appears top-right.

**Scope testing still works** (dev only): stop the server and run `DEV_ROLE=manager npm run dev` (or `employee`) to view team/self scopes without making extra Clerk users. Plain `npm run dev` = your real role (`hr_admin`).

> **Demo simplification:** first sign-in claims the *existing seeded* tenant. Real onboarding (new org → new empty tenant, invite teammates via Clerk Organizations) is Phase 5.

## How this maps to the ADR phases

- ✅ **Phase 1 (read path)** — People reads from Postgres.
- ✅ **Phase 2 (auth)** — Clerk login gates the app; `getSession()` resolves tenant/role from the Clerk user (provisioned into `app_user`). Repos are unchanged — they still just take a `Session`.
- ✅ **Phase 3 (server-side AI, NH-028)** — the `/api/assistant` route runs the Claude tool loop server-side; tools (`src/lib/ai-tools.ts`) compute over `listPeople(session)`, so the AI can never exceed the user's tenant + role scope. Key stays server-side. Chat panel: `src/app/people/assistant.tsx`. (Non-streaming for now; streaming is a quick follow-up.)
- ✅ **Phase 4 (writes)** — "Add employee" (HR Admin only) inserts `worker` + dated Hire `job_event` + `compensation_event` + `audit_log` in one transaction (`src/repos/people-write.ts`, server action in `src/app/people/actions.ts`).

## Notes / caveats (slice scope)

- Auth is **Clerk** (Phase 2). First sign-in claims the seeded demo tenant; proper multi-org onboarding is Phase 5.
- RLS relies on the app connecting as a **non-superuser** role (Neon's default role is fine; superusers bypass RLS).
- Drizzle schema and `sql/*.sql` are hand-kept in sync here; going forward `drizzle-kit generate` can own table DDL while RLS stays in `sql/`.
- Add a cross-tenant isolation **test** before trusting RLS in production (ADR §7).
