# NayaHR — Deployment Guide (local → production)

Moves the `platform/` app off your laptop onto always-on cloud services for a first client / design partner.

**Stack in production:** Next.js app → **Vercel** · Postgres → **Neon (or AWS RDS Mumbai)** · auth → **Clerk (production instance)** · AI → **Anthropic API**.

> ⚠️ **Readiness note (updated 2026-06-26):** All six modules are now on the real backend — **Core HR, Recruitment, Performance, Compensation, Time & Leave, Reporting** — with self-serve onboarding, CSV roster import, approval workflows (requisitions, pay changes, performance reviews, leave), an Inbox of pending approvals, employee portal logins (Clerk invitation emails), and an AI assistant that can both answer and **take actions** within the user's permissions. **No payroll engine yet** (statutory PF/ESI/TDS calc + payslips). This guide gets you **online**; treat the first client as a design partner while you add payroll + harden.

---

## What you'll end up with
- A public website at your domain (e.g. `https://app.nayahr.com`), always on.
- One **multi-tenant** deployment — you add each client as a tenant (you don't redeploy per client).
- Estimated cost to run: **~$50–80/mo total** (shared across all clients).

---

## Step 0 — Prerequisites (accounts, all have free signups)
- **GitHub** (to store the code; Vercel deploys from it)
- **Vercel** (app hosting)
- **Neon** paid plan *or* AWS/Supabase for a Mumbai database
- **Clerk** (you already have a dev instance — you'll add a production one)
- A **domain** (Namecheap / GoDaddy / Cloudflare ~₹800–1,500/yr)

---

## Step 1 — Put the code on GitHub
Secrets stay out of Git (`.env` is already gitignored). From the repo root:

```bash
cd "/Users/anuragsharma/Desktop/Anurag/Claude Working Folder/NayaHR"
git init
git add .
git commit -m "NayaHR: prototype + platform"
```
Then create a **private** repo on github.com and push (GitHub shows the exact commands, roughly):
```bash
git remote add origin https://github.com/<you>/nayahr.git
git branch -M main
git push -u origin main
```
✅ Check: your code is in a private GitHub repo, and `.env` / `.dev-session.json` are **not** in it.

> Faster alternative (no GitHub): install the Vercel CLI and run `vercel` from inside `platform/`. GitHub is recommended though — it gives auto-deploy on every push.

---

## Step 2 — Production database
Your code connects to any Postgres via `DATABASE_URL`. Pick one:

**Option A — Neon paid (simplest; verified working with our row-level security).** Region: Singapore (closest to India; Neon has no Mumbai yet).
**Option B — India residency: AWS RDS Postgres `ap-south-1 (Mumbai)` or Supabase (Mumbai).** Required before storing real customer data long-term.

> 🔒 **Critical for tenant isolation — verified 2026-06-30:** Neon's default `neondb_owner` role has **`BYPASSRLS`**, which silently disables Row-Level Security *even with FORCE*. The app must connect as a **separate role that does NOT bypass RLS**, or every signed-in user can read all tenants' data. Set up:
> 1. **Neon Console → Roles → New Role**, name it exactly **`nayahr_app`** (Neon generates a password + connection string).
> 2. Grant it privileges (run as the owner): `DATABASE_URL="<owner DIRECT url>" npm run db:apply -- sql/0015_app_role_grants.sql`
> 3. In Vercel set **`APP_DATABASE_URL`** = the **`nayahr_app` pooled** connection string. The app prefers `APP_DATABASE_URL`; `DATABASE_URL` (owner) is used only for migrations. Verify with the isolation test in Step 7.

**Create the schema on the prod DB** (run from your laptop, pointing at the prod connection string — use the **direct/unpooled** string for this):
```bash
cd platform
DATABASE_URL="postgresql://…PROD…?sslmode=require" npm run db:migrate
```
> The client's tenant is **created automatically** when their first user signs up (self-serve onboarding) — no manual tenant creation needed. **Don't** run `npm run seed` against a client DB (that's demo data).

✅ Check: migrate prints `Migration complete.`

---

## Step 3 — Clerk production instance
Clerk keeps **dev** and **prod** separate.
1. Clerk dashboard → create a **Production** instance for your app.
2. Set its **domain** to your real domain (e.g. `app.nayahr.com`). Clerk gives you **DNS records (CNAMEs)** to add at your registrar — add them (used in Step 5).
3. Copy the **production** keys: `pk_live_…` and `sk_live_…`.
4. Set the same redirect URLs (`/sign-in`, `/sign-up`, fallback `/people`).
5. **Allowed redirect URLs / origins:** add your production domain (e.g. `https://app.nayahr.com`) so the **employee invitation emails** (People → Invite) resolve correctly. Set `APP_URL` to the same domain in Vercel.

✅ Check: you have `pk_live_…` and `sk_live_…` and the Clerk DNS records noted.

---

## Step 4 — Deploy to Vercel
1. Vercel → **Add New → Project → Import** your GitHub repo.
2. **Root Directory: `platform`** (important — the app lives in that subfolder).
3. Framework preset: **Next.js** (auto-detected). Leave build/install commands default.
4. **Environment Variables** (add these, Production scope):

| Name | Value |
|---|---|
| `DATABASE_URL` | prod Postgres string — on Neon use the **pooled** endpoint here (better for serverless) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
| `CLERK_SECRET_KEY` | `sk_live_…` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/people` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/people` |
| `ANTHROPIC_API_KEY` | `sk-ant-…` |
| `APP_URL` | `https://app.nayahr.com` — used as the redirect target for employee invitation emails |
| `PG_POOL_MAX` | *(optional)* `5` — Postgres pool size per serverless instance; keep small |

5. Click **Deploy**. Vercel builds and gives you a `…vercel.app` URL.

> `NODE_ENV=production` is automatic on Vercel, so the dev `DEV_ROLE` override is disabled in production — good.

✅ Check: the build succeeds and the `…vercel.app` URL loads the Clerk sign-in page.

---

## Step 5 — Custom domain
1. Vercel → Project → **Settings → Domains** → add `app.nayahr.com`. Vercel shows DNS records to add at your registrar.
2. Add **both** Vercel's records **and** the Clerk production CNAMEs (Step 3) at your domain registrar.
3. Wait for DNS to verify (minutes to a few hours); SSL is automatic.

✅ Check: `https://app.nayahr.com` loads and shows a padlock (valid SSL).

---

## Step 6 — Go live with the client
1. Visit your domain → **Sign up** as the client's HR admin. A fresh company tenant is **created automatically** and they become `owner`.
2. On the empty People screen, click **Import your roster** → upload their CSV (columns: name, title, department, location, salary, hire date, email) → done.
3. Invite their managers/employees: on each People row use **Invite** → it sends a Clerk sign-up email; when they sign in with that address they land in this company scoped to their own record (ESS). Set each person's role as needed.

---

## Step 7 — Production essentials (don't skip)
- **Test tenant isolation:** create a *second* tenant + user; confirm tenant A's HR admin sees **zero** of tenant B's people. (This proves RLS works on your chosen DB role.)
- **Backups:** enable/verify automated backups (Neon and RDS both offer them).
- **Monitoring:** add an uptime check (e.g. UptimeRobot) + watch Vercel + Anthropic usage dashboards.
- **Legal:** a privacy policy + a simple Data Processing Agreement (India **DPDP Act**). Decide data-residency stance (Mumbai DB if promised).
- **Secrets:** all live in Vercel env vars + provider dashboards — never in Git.

---

## Updating the app later
With the GitHub path: `git push` → Vercel auto-builds and redeploys. Database schema changes: add a new `sql/000X_*.sql` migration and run `db:migrate` against prod (it's additive — the destructive drops in `0000` are dev-only; write prod migrations as `ALTER`/`CREATE … IF NOT EXISTS`, **not** drops).

> ⚠️ Note: `sql/0000_init.sql` starts with `DROP TABLE` for easy dev resets — **never run `db:reset` against a client's production DB.** For prod, only ever apply new additive migration files.

---

## Cost recap (monthly, shared across all clients)
| Service | ~Cost |
|---|---|
| Vercel (Pro) | ~$20 |
| Neon (Launch) / RDS Mumbai | ~$19–50 |
| Clerk | $0 (free tier covers small clients) |
| Anthropic AI | ~$5–30 (usage) |
| Domain | ~$1–2 |
| **Total** | **~$50–100/mo** for the whole platform; marginal cost per extra 50-employee client ≈ ₹500–1,500/mo |
