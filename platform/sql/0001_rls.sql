-- NayaHR — Row-Level Security: tenant isolation enforced in the database.
-- FORCE RLS so the policy applies even to the table owner (the role the app
-- connects as). Every request sets the `app.tenant` GUC inside its transaction;
-- migrate/seed scripts also set it before writing.

-- current tenant from the per-request GUC (missing-safe -> NULL)
create or replace function app_tenant() returns uuid
language sql stable as $$
  select nullif(current_setting('app.tenant', true), '')::uuid
$$;

-- enable + force RLS on every table
do $$
declare t text;
begin
  foreach t in array array[
    'tenant','app_user','department','location','worker','job_event','compensation_event','audit_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force  row level security', t);
  end loop;
end $$;

-- tenant table: a session can only see/insert its own tenant row
create policy tenant_self on tenant
  using (id = app_tenant())
  with check (id = app_tenant());

-- all tenant-scoped tables: isolate by tenant_id on both read and write
do $$
declare t text;
begin
  foreach t in array array[
    'app_user','department','location','worker','job_event','compensation_event','audit_log'
  ] loop
    execute format(
      'create policy tenant_isolation on %I using (tenant_id = app_tenant()) with check (tenant_id = app_tenant())',
      t
    );
  end loop;
end $$;
