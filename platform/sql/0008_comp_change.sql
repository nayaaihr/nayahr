-- NayaHR — Compensation change requests (manager/HR initiate → HR approves →
-- writes an effective-dated compensation_event). Additive.
create table if not exists comp_change_request (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenant(id),
  worker_id      uuid not null references worker(id),
  current_amount numeric,
  new_amount     numeric not null,
  effective_date date not null,
  reason         text,
  status         text not null default 'Pending',   -- Pending | Approved | Rejected
  requested_by   uuid,
  decided_by     uuid,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);
create index if not exists comp_change_idx on comp_change_request (tenant_id, worker_id);

alter table comp_change_request enable row level security;
alter table comp_change_request force  row level security;
drop policy if exists tenant_isolation on comp_change_request;
create policy tenant_isolation on comp_change_request
  using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
