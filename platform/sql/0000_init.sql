-- NayaHR — effective-dated Core HR schema (NH-027 vertical slice)
-- Idempotent for a dev DB: drops and recreates.

drop table if exists audit_log, compensation_event, job_event, worker, location, department, app_user, tenant cascade;
drop function if exists app_tenant() cascade;

create extension if not exists pgcrypto;

-- ---- tenants & users ----
create table tenant (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  country     text not null default 'IN',
  created_at  timestamptz not null default now()
);

create table app_user (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  email       text not null,
  role        text not null check (role in ('owner','hr_admin','manager','employee')),
  worker_id   uuid,                      -- link to their worker record (nullable)
  created_at  timestamptz not null default now(),
  unique (tenant_id, email)
);

-- ---- reference data ----
create table department (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  name        text not null
);
create table location (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  name        text not null
);

-- ---- identity (immutable) ----
create table worker (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  full_name   text not null,
  email       text,
  hired_on    date not null,
  created_at  timestamptz not null default now()
);

-- ---- effective-dated job/position facts (append-only history) ----
create table job_event (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  worker_id         uuid not null references worker(id),
  effective_date    date not null,                 -- valid-time (real-world)
  seq               int  not null default 0,       -- same-day tie-break (EFFSEQ)
  event_type        text not null,                 -- Hire | Promotion | Transfer | Comp change | Terminate
  title             text not null,
  department_id     uuid references department(id),
  location_id       uuid references location(id),
  manager_id        uuid references worker(id),
  employment_status text not null default 'Active',
  recorded_at       timestamptz not null default now(), -- transaction-time
  recorded_by       uuid,
  is_correction     boolean not null default false,
  unique (tenant_id, worker_id, effective_date, seq)
);
create index job_event_asof_idx on job_event (tenant_id, worker_id, effective_date desc, seq desc);

-- ---- effective-dated compensation (append-only history) ----
create table compensation_event (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  worker_id         uuid not null references worker(id),
  effective_date    date not null,
  seq               int  not null default 0,
  amount            numeric(12,2) not null,
  currency          text not null default 'INR',
  frequency         text not null default 'annual',
  components        jsonb,                          -- future: PF/ESI/PT/TDS breakdown
  recorded_at       timestamptz not null default now(),
  recorded_by       uuid,
  is_correction     boolean not null default false,
  unique (tenant_id, worker_id, effective_date, seq)
);
create index comp_event_asof_idx on compensation_event (tenant_id, worker_id, effective_date desc, seq desc);

-- ---- audit log (append-only; written in the same tx as the mutation) ----
create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  actor_id        uuid,
  at              timestamptz not null default now(),
  action          text not null,
  entity          text not null,
  entity_id       uuid,
  effective_date  date,
  before          jsonb,
  after           jsonb,
  request_id      text
);
create index audit_log_idx on audit_log (tenant_id, at desc);
