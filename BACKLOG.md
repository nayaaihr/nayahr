# NayaHR — Product Backlog

Groomed backlog of discrete, pullable items. Each has a stable ID, priority, effort, and acceptance criteria ("done when").

**Priority:** P1 = do soon / high value · P2 = next · P3 = later / larger
**Effort:** S = hours · M = a session · L = multi-session · XL = major
**Status:** Todo · In progress · Done

_Last updated: 2026-06-24_

---

## Built so far (done)
Core HR (effective-dated) · Time & Leave · Reporting (NL query) · Recruitment (ATS) · Talent & Performance · Compensation (pay bands, compa-ratio) · Claude AI assistant (per-persona scoped) · premium UI · role/identity layer (HR Admin / Manager / Employee).

---

## Epic A — Quick refinements

### NH-001 · Reset demo data button — P1 · S · ✅ Done
Add a "Reset demo data" action (Import/Onboard view) that calls `resetData()` and re-seeds.
**Why:** existing localStorage keeps stale data — e.g. Manager → Hiring is empty because old requisitions have random hiring-manager names. Also a clean demo reset.
**Done when:** a visible button re-seeds all modules; manager-linked requisitions appear; a confirm guards it.

### NH-002 · Toasts + styled confirm modal — P2 · S · Todo
Replace `alert()` / `confirm()` with non-blocking toast notifications and an in-app confirm dialog.
**Done when:** no native `alert`/`confirm` remain in user flows; success/error toasts appear for save/apply/hire actions.

### NH-003 · Per-KPI icons — P2 · S · Todo
A small colored glyph on each KPI tile (Workday worklet feel), per metric.
**Done when:** dashboard + module KPI tiles show a relevant icon without breaking layout.

### NH-004 · Empty & loading states + page fade — P2 · M · Todo
Consistent empty states and a subtle content fade-in.
**Done when:** every list/table has a styled empty state; fade does not flicker the People/Directory search re-render.

### NH-005 · Richer charts — P3 · M · Todo
Donut (headcount mix), sparklines (trend), salary histogram in Comp/Reporting.
**Done when:** at least one non-bar chart type renders from live data (no heavy chart lib unless justified).

### NH-006 · Inline input validation — P3 · S · Todo
Validate numeric salary, valid dates, required fields with inline errors.
**Done when:** invalid form submits are blocked with a field-level message, not an `alert`.

---

## Epic B — Persona / experience

### NH-007 · Manager team-comp visibility — P1 · S · ✅ Done
Read-only comp for a manager's direct reports (salary + compa-ratio), respecting MSS boundary.
**Done when:** Manager persona has a team-comp view/section; employees still cannot see others' pay.

### NH-008 · Org chart — P2 · M · Todo
Reporting tree from the `manager` field on Manager "My Team" and/or People.
**Done when:** an interactive/visual hierarchy renders for a chosen manager or the whole org.

### NH-009 · Notifications / tasks inbox — P2 · M · Todo
Cross-module, per-persona inbox: approvals pending, reviews due, self-review reminders.
**Done when:** each persona sees a badge/list of their actionable items linking to the right view.

### NH-010 · Persona home polish — P2 · M · Todo
Upcoming time off, anniversaries/birthdays, announcements on Employee/Manager home.
**Done when:** home screens feel like a landing page, not just KPIs.

### NH-011 · Real identity / auth (replace role switcher) — P3 · L · Todo
Login → actual role + permissions instead of the demo "Viewing as" switcher. Depends on NH-027 (RBAC).
**Done when:** a user authenticates and lands in their real persona scope.

---

## Epic C — Module deepening

### NH-012 · Comp merit / review cycle — P2 · L · Todo
Budget pool, propose increases across a team, model spend vs budget, route for approval.
**Done when:** a manager/HR can plan raises against a budget and submit; applied changes hit effective-dated history.

### NH-013 · Total compensation — P2 · M · Todo
Bonus, equity/ESOP, variable pay — beyond base salary.
**Done when:** comp views show total-comp components, not just base.

### NH-014 · Pay equity analysis — P3 · M · Todo
Comp by gender/location/dept, flag gaps. Needs added demographic fields.
**Done when:** an equity report surfaces statistically notable gaps.

### NH-015 · Multi-currency — P3 · M · Todo
Currency per location/entity; bands and pay in local currency.
**Done when:** comp displays correct currency; metrics convert sensibly.

### NH-016 · Accrual-based leave balances + policies — P2 · M · Todo
Replace the flat 18-day balance with accrual schedules, leave types, carry-over.
**Done when:** balances accrue per policy; multiple leave types with their own rules.

### NH-017 · Timesheets / attendance + holidays — P3 · L · Todo
Time capture, holiday calendars.
**Done when:** basic timesheet entry + a holiday calendar exist.

### NH-018 · Recruitment depth — P3 · L · Todo
Offer management (letters, e-sign), interview scheduling, scorecards, source analytics.
**Done when:** at least offer + scorecards added to the ATS.

### NH-019 · Talent depth — P3 · L · Todo
9-box / talent matrix, calibration, continuous feedback, succession.
**Done when:** a 9-box view and calibration flow exist.

### NH-020 · Position management + full effective-dating — P3 · L · Todo
Workday-style positions vs jobs; future-dated/effective-dated changes across all entities (not just comp).
**Done when:** changes can be future-dated and the model supports positions.

### NH-021 · Payroll — P3 · L · Todo
Payroll run or (preferred) integration with a provider — multi-jurisdiction compliance. Agreed: last / partner.
**Done when:** decision made + first integration or run prototype.

---

## Epic D — AI assistant

### NH-022 · Stream AI responses — P1 · S · ✅ Done
Token-by-token streaming (currently non-streaming, thinking disabled). Consider adaptive thinking with `display: summarized`.
**Done when:** assistant text streams into the panel; tool loop still works.

### NH-023 · Tool-use transparency — P2 · S · Todo
Show which tools the assistant called (e.g. "used: comp_outliers").
**Done when:** each answer can reveal the tools/queries behind it.

### NH-024 · Persona-scoped tools (vs snapshot injection) — P2 · M · Todo
Replace the employee/manager JSON-snapshot-in-prompt approach with real scoped tools.
**Done when:** non-admin personas use tools filtered to their boundary, not an injected blob.

### NH-025 · AI onboarding / config from spreadsheet — P2 · L · 🟡 In progress
Map a client's spreadsheet columns → entities, suggest setup. (Strategic differentiator.)
**Progress (2026-06-25):** Basic CSV roster import shipped (`src/repos/import.ts`) — auto-maps common column-name variants (name/department/doj/ctc…), creates departments/locations on the fly. Remaining (the AI part): use Claude to map *arbitrary/messy* spreadsheet columns → fields, infer departments, and propose an editable mapping before import.
**Done when:** uploading a messy HR spreadsheet produces a proposed, editable config.

### NH-026 · Cross-view memory + citations + proactive insights — P3 · M · Todo
Conversation memory across views, citations to source records, dashboard insights.
**Done when:** assistant references prior turns and links claims to records.

---

## Epic E — Platform / architecture

### NH-027 · Real backend (API-first, effective-dated, RBAC, audit) — P1-when-ready · XL · 🟡 In progress
Production data model with effective-dating at the core, RBAC, and an audit trail from day one. Prototype becomes a client. See `ADR-001-backend-foundation.md`.
**Progress (2026-06-24):** Vertical slice scaffolded in `platform/` — Next.js + Drizzle + Postgres. Effective-dated schema (worker / job_event / compensation_event / audit_log), FORCE-RLS tenant isolation, seed parity with the prototype (~48 workers), the effective-dated "as-of" query (RBAC-scoped), a read API (`/api/people`), and the People view wired to it. **✅ Phase 1 RUNTIME-VERIFIED against a Neon Postgres DB (Singapore region): People view loads live, RBAC scoping (org/team/self) confirmed via DEV_ROLE, `/api/people` returns scoped JSON.**
**Phase 2 (auth) — ✅ RUNTIME-VERIFIED 2026-06-24 (Clerk):** `@clerk/nextjs` middleware gates the app; sign-in/up pages; `getSession()` resolves tenant/role from the Clerk user (provisioned into `app_user`, first sign-in claims the demo tenant as hr_admin); `app_user_self` RLS policy breaks the bootstrap chicken-and-egg; dev-only `DEV_ROLE` override kept for scope testing. User signed up, lands on /people as hr_admin with 48 records. (Setup gotchas hit: must restart dev server + `rm -rf .next` after any `.env` change; Clerk pk/sk must be from the SAME app; "missing required error components" = stale build/server.) Also advances NH-011.
**Phase 4 (writes + audit) — code complete 2026-06-24:** "Add employee" (HR Admin only) — `createWorker()` inserts `worker` + dated Hire `job_event` + `compensation_event` + `audit_log` in ONE transaction (effective-dated + audited + RLS-scoped + permission-gated). Server action `addEmployee` + client modal `AddEmployee`; `listRefData` for dept/location dropdowns. Type-checks + production build pass. No schema change (no migration). **Pending user runtime verification (add employee → count 49, persists in DB).**
**Phase 3 (server-side AI = NH-028) — ✅ RUNTIME-VERIFIED 2026-06-24:** `/api/assistant` route runs the Claude tool loop server-side; tools (`headcount`, `find_employees`, `salary_summary` in `src/lib/ai-tools.ts`) compute over `listPeople(session)` → automatically tenant + role scoped (the AI literally cannot exceed the user's access). API key server-side only. Chat panel `assistant.tsx` on /people. Non-streaming (streaming = follow-up, port of NH-022). Verified working as both hr_admin (org-wide) and manager (team-scoped). (Setup gotcha: a shell-exported `ANTHROPIC_API_KEY` from the prototype overrode `.env` — Next gives shell env priority; `unset` it.)
**Phase 5 (onboarding + import) — code complete 2026-06-25:** self-serve onboarding — a new sign-in auto-creates its OWN company tenant as `owner` (`provisionNewTenant()` in `session.ts`, replacing the demo-tenant claim; existing demo account still resolves via lookup). CSV bulk roster import — `importEmployees()` (`src/repos/import.ts`) creates workers + dated Hire events + comp + audit, auto-creating departments/locations, per-row resilient; `importRoster` action + `import-roster.tsx` modal + empty-state CTA on /people. Type-checks + build pass. **Pending user runtime test.**
**Time & Leave — ported onto the backend 2026-06-25 (first module beyond Core HR):** new `leave_request` table (`sql/0003_leave.sql`, applied additively via new `db:apply` script — does NOT wipe data, unlike destructive `db:migrate`). `src/repos/leave.ts` — `listLeave` (RBAC-scoped via `listPeople` worker set: employee=self, manager=team, admin=org), `requestLeave` (employee self-request + audit), `decideLeave` (manager approves own team / admin any + audit). `/leave` page (role-adaptive: balance + request for employees; approvals table for managers/admins), `RequestLeave` + `DecideButtons` clients, top-nav added to layout (People | Time off). Type-checks + build pass. **Pending user runtime test.**
**Compensation — ported 2026-06-25 (read-only, no new table):** `src/repos/comp.ts` (pay bands, levelOf, compa-ratio, range position, below/above flags) reuses `listPeople` salary → role-scoped; `/comp` page (employee=own pay-vs-band card; manager=team; admin/owner=org KPIs + pay-bands table + detail). Nav item + `.rangebar` CSS added. Build passes.
**Recruitment — ported 2026-06-25:** `requisition` + `candidate` tables (`sql/0004_recruitment.sql`, applied via `db:apply` + demo data seeded into demo tenant). `src/repos/recruit.ts` — `listRecruitment` (admin/owner=all, manager=own reqs, employee=none), `createRequisition`, `moveCandidate` (advance), `setCandidateStage` (reject), `hireCandidate` (→ creates real Core HR worker + dated Hire job_event + comp + audit — the lifecycle handoff). `/recruit` page (KPIs + requisitions table + candidate pipeline table with advance/reject/hire actions), `NewReq` + `CandidateActions` clients, nav item. Build passes. (Follow-up: add-candidate UI; kanban board view.)
**Performance — ported 2026-06-25:** `review` + `goal` tables (`sql/0005_performance.sql`, applied via `db:apply` + seeded 50 reviews/46 goals). `src/repos/perf.ts` — `listPerformance` (role-scoped reviews+goals+stats), `submitSelfReview` (employee self), `rateReview` (manager team / admin any, sets Completed + rating, audited). `/perform` page (employee=my review+goals+submit; manager/admin=KPIs + review table with clickable star ratings + goals panel), `SelfReviewButton`/`RateStars` clients, nav. Build passes.
**Reporting — ported 2026-06-26:** `src/repos/reports.ts` `buildReport(s)` aggregates across the existing module repos (listPeople/listComp/listRecruitment/listPerformance) — no new tables. `/reports` page: KPIs (active headcount, joiners 90d, payroll, open roles) + headcount-by-department & by-location bar lists + compensation / recruiting / performance summary tables. Role-scoped (org for admin/owner, team for manager, blocked for employee). SideNav made role-aware (`roles` allowlist on items) — Reports + Recruitment hidden from employees; layout passes `role` to SideNav. Build passes.
**SIX modules now on the real backend — full prototype parity:** Core HR, Recruitment, Performance (+ review workflow), Compensation, Time & Leave, Reporting.
**Employee portal logins — built 2026-06-26 (email-claim invites, instead of Clerk Organizations).** Decision: skipped Clerk Orgs (heavy machinery + dev-instance friction per NH-035) for an email-claim model that reuses `app_user`. `sql/0007_invites.sql` adds two RLS policies (`app_user_invite_select` / `app_user_invite_claim`) letting a signing-in user find + claim ONLY the pending `app_user` matching their Clerk-verified email (via `app.clerk_email` GUC). `getSession` now: existing membership → else claim pending invite → else provision new tenant. `repos/access.ts` (`listAccess`, `inviteEmployee` HR/owner-only, audited). People page has a **Portal access** column (Invite / Invited / Portal active) via `InviteCell` + `invite-action.ts`. RLS claim verified at DB level incl. negative (wrong email can't see/claim). **Invite email wired 2026-06-26:** `invite-action.ts` calls Clerk `clerkClient().invitations.createInvitation({ emailAddress, redirectUrl: appUrl(), ignoreExisting: true })` (best-effort — DB invite is source of truth, send failures non-fatal; surfaces "email sent" / "already has account" / "couldn't send, share link"). `appUrl()` uses `APP_URL` env or request host. **Follow-ups:** for prod, add the deployed domain to Clerk's allowed redirect URLs + set `APP_URL`; handle user-signed-up-before-invite; once adopted, retire the DEV_ROLE switcher.
**Phase 5 essentially complete** — six modules + onboarding + import + AI + employee logins on the real backend. Next: deploy (DEPLOYMENT.md) to put a real client online.

**Workflow deepening — 2026-06-26 (5 items, all build-verified):**
1. **Recruitment requisition approval** — managers can now raise reqs (`createRequisition` allows manager → status 'Pending approval'); HR approves/rejects via `decideRequisition` (`req-actions.tsx` `ReqDecision`). Page shows pending-approval KPI + approve/reject for HR; NewReq shown to managers with an approval note. Status pill includes 'Pending approval'.
2. **Compensation change workflow (effective-dated)** — new `comp_change_request` table (`sql/0008`). `comp.ts`: `requestCompChange` (manager=team/HR=any → Pending), `decideCompChange` (HR approve → inserts effective-dated `compensation_event` at next seq for that date; or reject), `listCompChanges`. `/comp`: Request-pay-change modal (`comp-actions.tsx`) + pay-change-requests panel with approve/reject (HR).
3. **Indian standard leave types** — `leave.ts` `LEAVE_TYPES` (Earned/Privilege 18, Casual 12, Sick 12, Maternity 182, Paternity 15, Bereavement 5, Marriage 3, Comp-off, Loss of Pay) + `balancesFor` per-type; leave page shows per-type balance tiles (Earned/Casual/Sick); request modal dropdown driven by types passed as prop.
4. **People Manager column** — `listPeople` self-joins worker for `manager_name`; People table has a Manager column.
5. **Profile photo upload** — `worker.photo_url` (`sql/0009`); `repos/profile.ts` (`getMyProfile`, `setMyAvatar`); `avatar.tsx` (client crops/downscales to 96px JPEG data URL) + `profile-chip.tsx` server component in sidebar foot; `avatar-action.ts`. Photos also render in People table avatars. Attaches to the worker record → personas linked to a worker (employee/manager) can set it; owner/HR with no worker row use the Clerk UserButton avatar.

**Round 2 — 2026-06-26 (4 items, all build-verified):**
6. **Recruitment add-candidate** — `recruit.ts` `addCandidate` (HR any open req; manager own req; only 'Open' reqs accept), `add-candidate.tsx` modal (req dropdown) in the pipeline panel. Closes the create-req→add-candidate→advance→hire loop (the new Marketing-Director/Zurich req had no way to add candidates before).
7. **Comp India structure + history** — `lib/salary.ts` `salaryBreakdown` (Basic 40%, HRA 50% of basic, Conveyance ₹19,200, Special Allowance balance, Employer PF 12%) + `rupee`; `comp.ts` `listCompHistory` (effective-dated from `compensation_event`); `comp-detail.tsx` (`SalaryStructure`/`CompHistory`/`CompDetailButton`). Employee self-view shows structure + change history; admin detail rows get a View modal.
8. **Inbox** — `repos/inbox.ts` `inboxItems`/`inboxCount` aggregates pending actions per role (leave approvals, requisition approvals, comp-change approvals, performance review steps self/manager/HR). `/inbox` page grouped with links; SideNav has an Inbox item with a live count badge fed from layout. **Optimized 2026-06-26:** `inboxCount` (runs every page load) rewritten as a single transaction of direct COUNT queries (org-scoped for HR via RLS; team subquery via latest-job_event manager_id for managers; self-review for employees) instead of calling the four module repos — verified against the DB to match `inboxItems`. `inboxItems` still uses the full repos but only runs on the `/inbox` page. **Inline actions 2026-06-26:** InboxItem now carries `id` + `action` (`approve_reject` | `acknowledge` | `link`); `/inbox` rows render inline Approve/Reject (leave/req/comp) or Acknowledge (HR review) via `inbox-actions.tsx` → `inbox/actions.ts` `inboxDecideAction` (dispatches to `decideLeave`/`decideRequisition`/`decideCompChange`/`hrAcknowledge`, revalidates `/inbox` + layout badge). Self-review & manager-review steps (need text/rating) stay an Open link to `/perform`.
9. **AI write actions** — `ai-tools.ts` adds write tools `create_requisition`, `add_candidate`, `request_comp_change`, `request_leave` that call the role-scoped repos (RBAC+audit enforced server-side); system prompt updated to take actions on request & confirm. Route flags `mutated` → assistant client `router.refresh()`. New persona chips include action examples. (Future: AI streaming on platform; promote/comp-change/terminate write events.)
**Done when:** API + persistent DB back the app; role permissions + audit enforced server-side; all MVP modules ported.

### NH-028 · Productionize the AI path — P1 · L · 🟡 Largely done (platform)
`proxy.js` is dev-only. Add real auth, per-tenant key handling, rate limiting, logging; run tool execution server-side against the DB (not localStorage).
**Progress (2026-06-24):** Delivered on the `platform/` backend as NH-027 Phase 3 — `/api/assistant` runs the tool loop server-side, tools execute against the RLS + role-scoped DB (tenant boundaries enforced by Postgres), API key server-side only, gated behind Clerk auth. **Remaining:** rate limiting, logging/observability, AI streaming, per-tenant key/usage controls.
**Done when:** the assistant works without a developer's local key and respects tenant boundaries server-side. *(Core boundary property ✅; ops hardening remains.)*

### NH-029 · Multi-tenant SaaS scaffolding — P2 · L · 🟡 In progress
Sign up → import spreadsheet → live. The "easy to install" promise.
**Progress (2026-06-25):** Self-serve onboarding shipped on `platform/` — a new sign-up auto-provisions its own tenant (owner), then CSV roster import populates it. Remaining: Clerk Organizations for inviting teammates into a tenant, billing/plans, tenant settings.
**Done when:** a new tenant can self-onboard to a working instance.

### NH-030 · Real CSV/PDF export + scheduled reports — P2 · M · Todo
**Done when:** key tables export to CSV/PDF; at least one scheduled report.

### NH-031 · Mobile responsiveness — P3 · M · Todo
Sidebar collapse, stacked tiles, responsive tables.
**Done when:** usable on a phone-width viewport.

### NH-032 · Accessibility — P3 · M · Todo
Keyboard nav, ARIA roles, focus management, contrast audit.
**Done when:** core flows are keyboard- and screen-reader-navigable.

### NH-036 · Performance: real review workflow — P1 · M · ✅ Done (2026-06-26)
Built the full multi-step review. `sql/0006_review_workflow.sql` added `review` columns `self_text`, `manager_comment`, `hr_status`, `hr_comment`, `stage` (Self-review → Manager review → HR review → Closed); backfilled 50 seeded reviews across the three stages. `perf.ts`: `submitSelfReview(text)` (employee → routes to Manager review), `managerReview(workerId, comment, rating)` (manager=team/admin=any, blocks reviewing self & acting before self-review, → HR review, audited), `hrAcknowledge(workerId, comment)` (HR only, → Closed, audited). UI: `review-drawer.tsx` `<ReviewButton>` — a modal showing a 3-step timeline with the role-appropriate form (self-assessment textarea / manager star-rating+comment+approve / HR acknowledge note). `/perform` page now has a Stage column + KPIs (closed %, avg rating, awaiting manager, awaiting HR). Button label adapts to the viewer's pending action ("Write self-review" / "Review →" / "Acknowledge" / "View"). Build passes.

### NH-035 · Upgrade Next 15 + React 19 + latest Clerk — P2 · M · Todo
Platform is on Next 14.2 / React 18; latest `@clerk/nextjs` requires Next 15 / React 19, so the SDK can't be updated. Surfaced 2026-06-25 by a Clerk `needs_client_trust not supported yet` error (device-trust on the dev instance under heavy multi-account test churn — a Clerk-side issue, worse with incognito; mitigated via dashboard attack-protection settings + normal browser profiles, and a non-issue on a real production Clerk instance).
**Done when:** platform builds on Next 15 / React 19 with latest `@clerk/nextjs`, all routes + server actions still pass.

---

## Epic F — Strategy / open questions

### NH-033 · Decide the strategic wedge — P1 · — · ✅ Done (2026-06-24)
**Decision: AI-native HRIS for Indian micro/small businesses (10–200 employees), industry-agnostic.** INR-only first; India compliance regime; India data residency; simplicity + self-serve onboarding paramount; cost-efficient shared-DB multi-tenancy; payroll = integrate. See `ADR-001-backend-foundation.md`.

### NH-034 · Define the MVP cut line — P1 · — · Todo (proposed)
Which modules/features ship to a first design-partner client.
**Proposed MVP (per the India micro-SMB wedge):** Core HR (effective-dated) + Time/Leave + Directory + ESS/MSS + AI assistant + **self-serve onboarding (NH-025)**. Recruitment / Performance / Compensation follow. Target first client: a 30–150-person Indian company with no dedicated HRIS (on spreadsheets / Zoho).
**Done when:** the above is confirmed/adjusted and a target design-partner profile is agreed.
