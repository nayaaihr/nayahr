-- NayaHR — Payroll (India). Monthly payroll runs + an immutable per-employee
-- payslip snapshot. Amounts are computed in the app (src/lib/payroll.ts) and
-- stored here so a finalized payslip never changes if salary later moves.

create table if not exists payroll_run (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id),
  period date not null,                 -- first day of the pay month
  status text not null default 'Draft', -- Draft | Finalized
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  finalized_by uuid,
  finalized_at timestamptz,
  unique (tenant_id, period)
);

create table if not exists payslip (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id),
  run_id uuid not null references payroll_run(id) on delete cascade,
  worker_id uuid not null references worker(id),
  basic numeric(14,2) not null default 0,
  hra numeric(14,2) not null default 0,
  conveyance numeric(14,2) not null default 0,
  special numeric(14,2) not null default 0,
  gross numeric(14,2) not null default 0,
  lop_days numeric(5,1) not null default 0,
  lop numeric(14,2) not null default 0,
  pf_employee numeric(14,2) not null default 0,
  esi_employee numeric(14,2) not null default 0,
  pt numeric(14,2) not null default 0,
  tds numeric(14,2) not null default 0,
  employer_pf numeric(14,2) not null default 0,
  employer_esi numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  net numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, run_id, worker_id)
);

create index if not exists payslip_run_idx on payslip (run_id);
create index if not exists payslip_worker_idx on payslip (worker_id);

-- RLS: tenant isolation in the DB; role scoping (employee → own payslips) is
-- enforced in the app repos, same pattern as comp/people.
alter table payroll_run enable row level security;
alter table payroll_run force  row level security;
alter table payslip     enable row level security;
alter table payslip     force  row level security;

drop policy if exists tenant_isolation on payroll_run;
create policy tenant_isolation on payroll_run using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());
drop policy if exists tenant_isolation on payslip;
create policy tenant_isolation on payslip using (tenant_id = app_tenant()) with check (tenant_id = app_tenant());

-- Privileges for the app role (0015's default privileges also cover new tables;
-- this is explicit + guarded so it's safe whether or not the role exists yet).
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'nayahr_app') then
    grant select, insert, update, delete on payroll_run, payslip to nayahr_app;
  end if;
end $$;
