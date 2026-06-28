# ADR-001 — Backend Foundation (NH-027)

**Status:** Accepted · 2026-06-24
**Context owner:** Anurag (HR domain) + engineering
**Supersedes:** localStorage prototype (`nayahr-prototype.html`)

---

## 1. Context

NayaHR is an AI-native HRIS. The working prototype (single-file, vanilla JS, localStorage) proves the UX and modules across the employee lifecycle, plus a Claude-powered assistant. To become a product we need a real backend.

**Wedge (decided 2026-06-24):** AI-native HRIS for **Indian micro/small businesses (10–200 employees)**, **industry-agnostic**. This wedge drives the decisions below — it favours *simplicity, self-serve onboarding, low per-tenant cost, and one compliance regime (India)*.

---

## 2. Decision

Build an **API-first backend over Postgres** where the **effective-dated model is the core**, **tenant isolation + RBAC are enforced in the database**, and **every write is audited**. Port the prototype to it **module-by-module (strangler-fig)**, never a big-bang rewrite. **The AI assistant executes through the same permission gate as the UI.**

### 2.1 Stack
| Layer | Choice | Rationale (for this wedge) |
|---|---|---|
| Language | **TypeScript** | One language with the prototype; Anthropic SDK first-class |
| DB | **Postgres on Neon** — dev region **AWS Singapore `ap-southeast-1`** (Neon has no Mumbai region yet; Singapore is the closest low-latency option to India) | SQL needed for effective-dating; native RLS. **True India data residency is revisited before real customer data** — see §6 Open decisions |
| Migrations | **Drizzle** | SQL-first; we control temporal queries + RLS, not hidden by an ORM |
| App/API | **Next.js (App Router)** | 1–2 person team: API + React + streaming in one deploy; split later if needed |
| Auth | **Clerk** (orgs = tenants) | Self-serve B2B signup out of the box; don't build auth. (Revisit WorkOS if/when SSO/SCIM demanded.) |
| AI | **Anthropic TS SDK, server-side** | Tools become DB-backed functions (NH-028) |
| Hosting | **Vercel** (app) + **Neon** (DB) | Fast, cheap, serverless — fits low-ACV economics |

### 2.2 Multi-tenancy — shared DB + Row-Level Security
`tenant_id` on every row; Postgres RLS as defense-in-depth. Each request opens a transaction and sets `app.tenant`, `app.user`, `app.role` from the Clerk session.
```sql
alter table job_event enable row level security;
create policy tenant_isolation on job_event
  using (tenant_id = current_setting('app.tenant')::uuid);
```
**Why not schema-per-tenant:** high tenant count × low ACV makes per-tenant schemas operationally and financially wrong here. Shared DB + RLS is the micro-SMB-correct choice.

### 2.3 Effective-dated core (the differentiator)
Separate immutable identity from time-varying facts; each fact type is an append-only history table (modernized PeopleSoft EFFDT/EFFSEQ).
```sql
worker(id uuid pk, tenant_id uuid, hired_on date)

job_event(
  id uuid pk, tenant_id uuid, worker_id uuid,
  effective_date date,        -- valid-time (real-world)
  seq int,                    -- same-day tie-break (EFFSEQ)
  event_type text,            -- Hire | Promotion | Transfer | Terminate
  title text, department_id uuid, location_id uuid,
  manager_id uuid, employment_status text,
  recorded_at timestamptz default now(),  -- transaction-time
  recorded_by uuid, is_correction bool,
  unique(tenant_id, worker_id, effective_date, seq)
)
compensation_event( … amount, currency='INR', frequency, components(jsonb for PF/ESI later) … )
personal_event( … effective-dated personal data … )
```
**"As of" is one query:**
```sql
select distinct on (worker_id) *
from job_event
where tenant_id = current_setting('app.tenant')::uuid
  and effective_date <= :as_of
order by worker_id, effective_date desc, seq desc;
```
Both temporal axes exist (`effective_date` + `recorded_at`); query valid-time only for now, enable full bitemporal (`recorded_at <= :knowledge_date`) when corrections/audit demand it.

### 2.4 RBAC — deliberately flat for micro-SMB
Roles: **Owner · HR Admin · Manager · Employee**. Permissions as `(action, resource, scope)`, scope ∈ self / team / org; team scope derives from `job_event.manager_id`. The prototype's role-switcher becomes real authenticated roles (NH-011). The **same scoping functions back both the UI and the AI tools** — the assistant physically cannot exceed the user's scope.

### 2.5 Audit trail
Append-only, written in the **same transaction** as the mutation:
```sql
audit_log(id, tenant_id, actor_id, at timestamptz, action,
          entity, entity_id, effective_date, before jsonb, after jsonb, request_id)
```

---

## 3. Explicitly deferred (because micro-SMB)
- **Position management** (Workday positions vs jobs) — job-based model is enough → NH-020 later.
- **Full bitemporal query API** — schema-ready, not built yet.
- **Multi-currency** — INR-only for the wedge → NH-015 later.
- **Schema-per-tenant** — not unless a regulated/large client demands it.
- **Build-your-own payroll** — **integrate** (RazorpayX Payroll / similar) rather than build → NH-021.
- **Enterprise SSO/SCIM** — Clerk now, WorkOS when demanded.

## 4. Elevated by the wedge
- **NH-025 (self-serve AI onboarding from spreadsheet)** moves up — at 10–200 employees there is no implementation team; "sign up → upload roster → live" *is* the product. Strong candidate for the MVP.

---

## 5. Migration path (strangler-fig)
1. **Scaffold** — schema + migrations + seed parity with the demo data; RLS + audit in place.
2. **Read path** — read API for Core HR; point the People view at it (feature-flag per module).
3. **Auth** — Clerk login replaces the role-switcher; roles become real (NH-011).
4. **Server-side AI** — move tool execution to the API against the DB (NH-028); reuse the same query functions.
5. **Writes** — effective-dated writes + audit; then port remaining modules + self-serve tenant onboarding (NH-029, NH-025).

No phase breaks the running app.

## 6. Open decisions
- **India data residency** — Neon has no Mumbai region today; dev runs on Singapore. Before onboarding a real customer, decide: wait for a Neon India region, or move to a provider with `ap-south-1` (AWS RDS/Aurora, Supabase, etc.). India DPDP doesn't mandate local storage, but Indian SMB customers often expect it.
- **Auth pick** — Clerk assumed, but **reconsider Clerk vs Neon Auth (Stack Auth) vs WorkOS at Phase 2**. Neon Auth writes users directly into Postgres (fits the tenant/user model); WorkOS wins if enterprise SSO/SCIM is needed early.
- MVP cut line (NH-034) — proposed minimum for this wedge: **Core HR (effective-dated) + Time/Leave + Directory + ESS/MSS + AI assistant + self-serve onboarding**. Recruitment / Performance / Compensation follow.
- Payroll integration partner (India).

## 7. Consequences
- ✅ Real effective-dating, tenant isolation, audit, and AI-scoped-to-user from day one.
- ✅ Cheap to run per tenant; self-serve fits the economics.
- ⚠️ Next.js couples API+UI initially — acceptable; documented API boundary keeps a future split cheap.
- ⚠️ RLS correctness is critical — needs tests that assert cross-tenant isolation.
