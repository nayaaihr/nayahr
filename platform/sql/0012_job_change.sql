-- NayaHR — Manager-initiated job changes that need HR approval. Additive.
create table if not exists job_change_request (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenant(id),
  worker_id      uuid not null references worker(id),
  effective_date date not null,
  title          text not null,
  department_id  uuid references department(id),
  location_id    uuid references location(id),
  manager_id     uuid references worker(id),
  new_status     text not null default 'Active',
  req_status     text not null default 'Pending',   -- Pending | Approved | Rejected
  requested_by   uuid,
  decided_by     uuid,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);
create index if not exists job_change_idx on job_change_request (tenant_id, worker_id);
alter table job_change_request enable row level security;
alter table job_change_request force  row level security;
drop policy if exists tenant_isolation on job_change_request;
create policy tenant_isolation on job_change_request using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
