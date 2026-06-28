# NayaHR — Status & Handoff

_Last updated: 2026-06-24 (end of session)_

Pick-up notes so we can resume fast. See also: `BACKLOG.md` (groomed items), `ADR-001-backend-foundation.md` (architecture decisions).

---

## The two things running

| | Prototype | Platform (real backend) |
|---|---|---|
| What | Full HRIS UI, all modules | The production foundation |
| Folder | `nayahr-prototype.html` (+ `proxy.js`) | `platform/` |
| Run | `node proxy.js` → http://localhost:8787 | `cd platform && npm run dev` → http://localhost:3000 |
| Data | Browser localStorage (throwaway) | Postgres (Neon, Singapore) — real, persistent |
| Status | Complete demo, 7 modules + AI + personas | Core HR module fully ported through 4 phases |

The plan: gradually port the prototype's modules onto the platform (strangler-fig), then retire the prototype.

---

## Decisions locked this session
- **Wedge:** AI-native HRIS for **Indian micro/small businesses (10–200 employees), industry-agnostic.** INR-first, India compliance, self-serve onboarding is the wedge feature, cost-efficient multi-tenancy. (NH-033 ✅)
- **Stack:** TypeScript · Next.js · Postgres/Neon · Drizzle · **Clerk** auth · Anthropic SDK. Multi-tenancy = shared DB + **row-level security**.
- **Proposed MVP (NH-034, not finalized):** Core HR + Time/Leave + Directory + ESS/MSS + AI + self-serve onboarding.

---

## Done today ✅
1. **Prototype**: premium UI redesign; built **Recruitment, Talent & Performance, Compensation** modules; **ESS/MSS personas** (role switcher); AI assistant streams + is persona-scoped.
2. **Backlog** groomed into 34 items (`BACKLOG.md`); shipped P1 quick wins (reset, streaming, manager team-comp).
3. **Real backend (`platform/`) — NH-027, all 4 core phases runtime-verified on the People/Core HR module:**
   - **Phase 1** — effective-dated reads on Postgres + RLS tenant isolation + RBAC scoping.
   - **Phase 2** — Clerk auth; identity/tenant/role from the logged-in user.
   - **Phase 4** — audited, effective-dated writes ("Add employee" = worker + Hire event + comp + audit_log in one transaction).
   - **Phase 3** — server-side AI assistant whose tools are scoped to the user's tenant + role (a manager's AI only sees their team).

---

## Left for tomorrow (NH-027 Phase 5 + polish)
**Next natural step — pick one:**
1. **Self-serve onboarding (NH-025, the wedge feature)** — real org → new tenant: a new company signs up (Clerk org), gets its own empty tenant, imports its roster (CSV/spreadsheet → AI maps columns). This is the "sign up → live in 10 min" promise. _High strategic value._
2. **Port the next module onto the backend** — e.g. **Time & Leave** or **Directory** (repeat the Phase-1→4 pattern: schema → repo → page → writes). _Proven recipe, steady progress._
3. **Polish the platform AI** — port streaming (NH-022) to `/api/assistant`; add tool-use transparency.

**Smaller follow-ups:** finalize the MVP cut line (NH-034); platform write enhancements (promote / comp-change / terminate as new effective-dated events); ops hardening for the AI path (rate limiting, logging — NH-028 remainder).

---

## How to resume the platform tomorrow
```bash
cd "/Users/anuragsharma/Desktop/Anurag/Claude Working Folder/NayaHR/platform"
npm run dev          # http://localhost:3000  (sign in via Clerk)
# scope testing:  DEV_ROLE=manager npm run dev   (or employee)
# fresh data:     npm run db:reset
```

### Gotchas learned (so we don't re-hit them)
- After **any `.env` change**, fully restart `npm run dev` (and `rm -rf .next` if it acts up). Env loads at startup only.
- A **shell-exported `ANTHROPIC_API_KEY`** (from the prototype) **overrides `.env`** — Next gives shell env priority. `unset ANTHROPIC_API_KEY` if the platform AI 401s.
- Clerk: publishable + secret keys must be from the **same app**; "missing required error components" / 404-after-login = stale build or wrong keys.
- Secrets go in `.env`, never in chat (we rotated a DB password + an API key after exposure).
- The platform runs from `platform/`; the prototype proxy runs from the repo root.

### Still open / to revisit
- **India data residency** — Neon has no Mumbai region; dev is on Singapore. Revisit before real customer data (ADR §6).
- **Auth** — Clerk chosen; could reconsider Neon Auth at scale.
