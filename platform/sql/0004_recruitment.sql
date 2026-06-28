-- NayaHR — Recruitment (ATS). Additive; apply with `npm run db:apply -- sql/0004_recruitment.sql`.
create table if not exists requisition (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  title             text not null,
  department        text,
  location          text,
  openings          int  not null default 1,
  status            text not null default 'Open',     -- Open | On hold | Closed
  hiring_manager_id uuid references worker(id),
  opened_on         date not null default current_date,
  created_at        timestamptz not null default now()
);
create index if not exists requisition_idx on requisition (tenant_id);

create table if not exists candidate (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  req_id      uuid not null references requisition(id),
  name        text not null,
  email       text,
  stage       text not null default 'Applied',        -- Applied | Screening | Interview | Offer | Hired | Rejected
  rating      int,
  source      text,
  applied_on  date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists candidate_idx on candidate (tenant_id, req_id);

alter table requisition enable row level security;
alter table requisition force  row level security;
alter table candidate   enable row level security;
alter table candidate   force  row level security;

drop policy if exists tenant_isolation on requisition;
create policy tenant_isolation on requisition using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
drop policy if exists tenant_isolation on candidate;
create policy tenant_isolation on candidate using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
