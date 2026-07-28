-- Super-admin (provider) cross-tenant summary. The app connects as a role that
-- CANNOT bypass RLS, so it can't read other tenants directly — by design. This
-- SECURITY DEFINER function runs as its owner (the migration role, which does
-- bypass RLS) and returns ONLY a non-sensitive tenant summary (no employee
-- data). Access is additionally gated in the app by a super-admin email
-- allowlist (SUPERADMIN_EMAILS); this function is only ever called from the
-- guarded admin repo.
--
-- Requires 0021 (tenant.name_confirmed). Run as the owner role.
create or replace function admin_tenant_summary()
returns table (
  id uuid,
  name text,
  country text,
  created_at timestamptz,
  name_confirmed boolean,
  workers int,
  users int,
  active_users int,
  owners text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    t.id, t.name, t.country, t.created_at, t.name_confirmed,
    (select count(*) from worker w  where w.tenant_id = t.id)::int,
    (select count(*) from app_user u where u.tenant_id = t.id)::int,
    (select count(*) from app_user u where u.tenant_id = t.id and u.clerk_user_id is not null)::int,
    (select string_agg(u.email, ', ' order by u.email) from app_user u where u.tenant_id = t.id and u.role = 'owner')
  from tenant t
  order by t.created_at asc
$$;

-- Only the app role may execute it (not PUBLIC).
revoke all on function admin_tenant_summary() from public;
grant execute on function admin_tenant_summary() to nayahr_app;
