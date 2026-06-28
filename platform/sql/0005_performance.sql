-- NayaHR — Talent & Performance. Additive; apply with `npm run db:apply -- sql/0005_performance.sql`.
create table if not exists review (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  worker_id   uuid not null references worker(id),
  self_status text not null default 'Not started',   -- Not started | Submitted
  mgr_status  text not null default 'Not started',    -- Not started | In progress | Completed
  rating      int,
  updated_at  timestamptz not null default now(),
  unique (tenant_id, worker_id)
);
create table if not exists goal (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  worker_id   uuid not null references worker(id),
  title       text not null,
  progress    int  not null default 0,
  status      text not null default 'On track',       -- On track | At risk | Done
  created_at  timestamptz not null default now()
);
create index if not exists review_idx on review (tenant_id, worker_id);
create index if not exists goal_idx on goal (tenant_id, worker_id);

alter table review enable row level security; alter table review force row level security;
alter table goal   enable row level security; alter table goal   force row level security;
drop policy if exists tenant_isolation on review;
create policy tenant_isolation on review using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
drop policy if exists tenant_isolation on goal;
create policy tenant_isolation on goal using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
