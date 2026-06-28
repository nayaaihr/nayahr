-- NayaHR — Time & Leave (Phase 5 module port).
-- Additive: safe to apply to an existing DB. (On a dev db:reset, 0000's
-- `drop table … worker … cascade` cascades to this table, then it's recreated here.)

create table if not exists leave_request (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  worker_id   uuid not null references worker(id),
  type        text not null,                 -- Annual | Sick | Casual | Work from home
  from_date   date not null,
  days        int  not null default 1,
  status      text not null default 'Pending', -- Pending | Approved | Rejected
  reason      text,
  created_at  timestamptz not null default now(),
  decided_by  uuid,
  decided_at  timestamptz
);
create index if not exists leave_request_idx on leave_request (tenant_id, worker_id);

alter table leave_request enable row level security;
alter table leave_request force  row level security;

drop policy if exists tenant_isolation on leave_request;
create policy tenant_isolation on leave_request
  using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
