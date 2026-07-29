# NayaHR — STATUS (at a glance)

One-screen "where things stand." Update the top of this file at the end of each work session. Detail lives in `BACKLOG.md` (items) and `LAUNCH-CHECKLIST.md` (blockers); orientation in `CLAUDE.md`.

_Last updated: 2026-07-29._

## ✅ Recently shipped (this phase)
- **Payroll**: bank/UPI export + statutory summary (NH-105); reopen + regenerate a finalized run (NH-106); payout method (NEFT/UPI) on payslips; PAN/UAN/bank/UPI capture. Migrations 0019–0020.
- **Quality/ops**: Vitest suite (`npm test`, 31 tests); CSV import robustness + preview (NH-107); Sentry error tracking + `/api/health` uptime probe (live, verified).
- **Legal**: draft DPDP-aligned Privacy Policy + DPA + Terms (`legal/`), live at `nayahr.in/{privacy,terms,dpa}` (noindex draft) + footer links + branded PDFs. `npm run legal:build` regenerates. **Pending lawyer review.**
- **Clients**: company-name onboarding prompt + `name_confirmed`; `npm run clients:list`; in-app **super-admin console** `/admin` (gated by `SUPERADMIN_EMAILS`, via `SECURITY DEFINER`). Migrations 0021–0022.
- **Performance/latency**: nav now uses `next/link` (no full-page reloads); app functions pinned to **Mumbai `bom1`** (`platform/vercel.json`); trimmed per-request layout work (super-admin folded into `getSession`, `getCompany` 2→1 query, parallelized); `withSession` sets the 3 RLS GUCs in one round-trip; profile page dedupes `listPeople` + parallel fetches. Tab switches much faster.

## 🔜 Next initiative
- **PWA (mobile app)** — Phase 1: responsive + installable, employee self-service first. Plan: `docs/PWA-PLAN.md`. Not started.

## 🐢 Follow-ups / known optimizations
- **Profile page (`/people/[id]`) worker-scoped queries.** It still fetches whole-tenant leave/comp/performance then filters to one worker — fine for small tenants, wasteful at scale. Rewrite `getWorkerDetail` (+ repo variants) to fetch only the target worker's data. Do once clients get larger. _(Biggest remaining single-page latency after Neon Mumbai.)_
- **Neon → Mumbai migration is the biggest latency lever** (see Blocked). Functions are already in Mumbai; co-locating the DB turns ~40ms round-trips into ~2ms and speeds every page (profile page most).

## ⛔ Blocked on the user (business/infra, not code)
- ToS + Privacy Policy **lawyer review** (fill `[Registered address]`, `[CIN]`, effective date first).
- Neon **paid + Mumbai region + verified backup restore**.
- **Vercel Pro**.

## ⚙️ Prod actions the user must run (if not done)
- Migrations on prod (owner `DATABASE_URL`): `0019`, `0020`, `0021`, `0022` — via `npm run db:apply -- sql/00XX.sql`. _(User indicated 0019/0020 done; confirm 0021/0022.)_
- Set `SUPERADMIN_EMAILS` in Vercel (platform) + redeploy → enables `/admin`.

## How to resume
New chat in this repo → CLAUDE.md auto-loads. Say what you want (e.g. "build the PWA — Phase 1 from docs/PWA-PLAN.md"). Ask me to update this file at the end of a session.
