# NayaHR — Product Backlog

Groomed, pullable backlog. Each item has an ID, priority, effort, and a "done when."

**Priority:** P1 = do soon / high value · P2 = next · P3 = later / larger
**Effort:** S = hours · M = a session · L = multi-session · XL = major

_Last updated: July 2026. (Supersedes the pre-backend demo-era backlog.)_

> For the focused pre-launch tracker, see **[LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md)**.

---

## ✅ Shipped (production, on app.nayahr.in)

**Platform & security**
- Next.js 14 App Router on Vercel · Postgres on Neon · Drizzle ORM · Clerk auth · Anthropic (Claude) AI.
- **Multi-tenancy via Postgres Row-Level Security** (FORCE RLS), app connects as a dedicated `nayahr_app` role that **cannot bypass RLS** (fixed the Neon `BYPASSRLS` hole).
- Production domains: marketing on `nayahr.in`, app on `app.nayahr.in`, auth on `clerk.nayahr.in`. Two Vercel projects (scoped builds via Ignored Build Step).
- Google OAuth + email sign-in. **Invite-only**: app-level gate (`SIGNUP_ALLOWLIST`) + Clerk **restricted** sign-up. "You need an invitation" screen. Employee invites send real Clerk invitations; **Resend invitation** supported.
- Roles: Owner / HR Admin / Manager / Employee. Owner "View as" for previewing lower roles. **Manage admins** (grant/revoke HR, transfer ownership). **Company rename** + logo.

**Modules**
- **Core HR** — effective-dated `job_event` / `compensation_event`, employee profile aggregating all modules, effective-dated edits, manager-change → HR approval.
- **Recruitment** — requisitions (manager → HR approval), candidate pipeline, **offer captures salary**, hire → creates Core HR employee + comp; auto-close on fill; close/delete; kebab row menus.
- **Performance** — goals workflow (employee → manager → HR) + review cycle (self → manager → HR).
- **Compensation** — India salary structure, effective-dated change history, change requests with HR approval.
- **Payroll** — monthly runs → per-employee **statutory payslips** (PF, ESI, PT, estimated new-regime TDS, LOP proration) → review → finalize (immutable). Payslips on employee profile.
- **Time off** — Indian leave types, balances, approvals, loss-of-pay.
- **Reporting** — headcount / cost views.
- **Inbox** — cross-module approvals & notifications with counts; approve/reject inline.
- **AI assistant** — on every page; agentic read + write tools (create requisition, comp change, leave, etc.) scoped by role through the same RLS-guarded repos.

**Go-to-market collateral**
- Marketing site + public careers page + "Share on LinkedIn". Architecture decks (full + customer), onboarding guide, pricing strategy + client pricing sheet.

---

## 🔴 Now — launch blockers (see LAUNCH-CHECKLIST.md)

### NH-101 · Fix roster hire-date import — P1 · S · ✅ Done (Jul 2026)
Importer stamped today's date instead of parsing the CSV `DD/MM/YY`.
**Done:** parses `DD/MM/YY`, `DD/MM/YYYY`, ISO, and `/`/`-`/`.` separators with a 2-digit-year pivot + range validation; empty/garbage still falls back to today.

### NH-102 · One-click "Create client workspace" — P1 · M
Replace the manual `SIGNUP_ALLOWLIST` + Clerk-invite flow with a single admin action that pre-creates a tenant + pending owner invite.
**Done when:** onboarding a new company is one action, no env edits; owner claims via a Clerk invite.

### NH-103 · Final RLS isolation re-test on prod — P1 · S · ✅ Done (Jul 2026)
Added `npm run rls:verify` (owner + nayahr_app connections). Prod: 10/10 checks pass — app role can't bypass RLS, default-deny with no tenant, per-tenant scoping, cross-tenant read + write blocked. Re-run anytime.

### NH-104 · Backups, region & monitoring readiness — P1 · S (Biz-led)
Neon paid + verified PITR; prod DB in **Mumbai** region; error tracking + uptime ping.
**Done when:** a restore has been tested; alerts fire on downtime/errors.

---

## 🟡 Next — before scaling past the first client

### NH-105 · Payroll bank export + statutory summary — P1 · M
NEFT/CSV of net pay for the bank; PF/ESI/PT/TDS totals sheet for filing.
**Done when:** a finalized run exports a bank file + a statutory summary matching the run totals.

### NH-106 · Payroll correction / un-finalize — P2 · M
Finalize is one-way today.
**Done when:** HR can correct a finalized run via a reversal or an audited next-run adjustment.

### NH-107 · CSV import robustness + preview — P2 · M
Quoted-field support; a validate/preview step before commit.
**Done when:** commas-in-values import correctly and the user sees a row preview + errors before importing.

### NH-108 · Automated tests (payroll math + RLS) — P2 · M
**Done when:** CI runs unit tests for the statutory calc and an isolation test for RLS.

---

## 🟢 Later — roadmap

### NH-201 · Full TDS engine — P3 · XL
Regime choice, investment declarations, 80C/HRA exemptions; **Form 16 / 24Q**.

### NH-202 · Statutory challans — P3 · L
PF/ESI **ECR** exports.

### NH-203 · Interview scorecards — P3 · M
Per-interviewer feedback + overall rating (replaces the removed candidate rating column).

### NH-204 · Org chart — P3 · M
Reporting tree from the `manager` field.

### NH-205 · Total compensation — P3 · M
Bonus, variable pay, ESOP beyond base salary.

### NH-206 · UX polish — P3 · M
Toast notifications + styled confirm dialogs (replace `alert`/`confirm`); richer charts; empty/loading states.

### NH-207 · Clerk Pro branding — P3 · S (Biz)
Remove the "Secured by Clerk" footer.

### NH-208 · `nayahr.in → www` canonicalization — P3 · S
Clean up the apex→www redirect for LinkedIn/OG previews.
