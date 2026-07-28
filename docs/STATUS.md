# NayaHR — STATUS (at a glance)

One-screen "where things stand." Update the top of this file at the end of each work session. Detail lives in `BACKLOG.md` (items) and `LAUNCH-CHECKLIST.md` (blockers); orientation in `CLAUDE.md`.

_Last updated: 2026-07-28._

## ✅ Recently shipped (this phase)
- **Payroll**: bank/UPI export + statutory summary (NH-105); reopen + regenerate a finalized run (NH-106); payout method (NEFT/UPI) on payslips; PAN/UAN/bank/UPI capture. Migrations 0019–0020.
- **Quality/ops**: Vitest suite (`npm test`, 31 tests); CSV import robustness + preview (NH-107); Sentry error tracking + `/api/health` uptime probe (live, verified).
- **Legal**: draft DPDP-aligned Privacy Policy + DPA + Terms (`legal/`), live at `nayahr.in/{privacy,terms,dpa}` (noindex draft) + footer links + branded PDFs. `npm run legal:build` regenerates. **Pending lawyer review.**
- **Clients**: company-name onboarding prompt + `name_confirmed`; `npm run clients:list`; in-app **super-admin console** `/admin` (gated by `SUPERADMIN_EMAILS`, via `SECURITY DEFINER`). Migrations 0021–0022.

## 🔜 Next initiative
- **PWA (mobile app)** — Phase 1: responsive + installable, employee self-service first. Plan: `docs/PWA-PLAN.md`. Not started.

## ⛔ Blocked on the user (business/infra, not code)
- ToS + Privacy Policy **lawyer review** (fill `[Registered address]`, `[CIN]`, effective date first).
- Neon **paid + Mumbai region + verified backup restore**.
- **Vercel Pro**.

## ⚙️ Prod actions the user must run (if not done)
- Migrations on prod (owner `DATABASE_URL`): `0019`, `0020`, `0021`, `0022` — via `npm run db:apply -- sql/00XX.sql`. _(User indicated 0019/0020 done; confirm 0021/0022.)_
- Set `SUPERADMIN_EMAILS` in Vercel (platform) + redeploy → enables `/admin`.

## How to resume
New chat in this repo → CLAUDE.md auto-loads. Say what you want (e.g. "build the PWA — Phase 1 from docs/PWA-PLAN.md"). Ask me to update this file at the end of a session.
