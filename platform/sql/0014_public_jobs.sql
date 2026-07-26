-- NayaHR — public careers page. Anonymous (no app.tenant) read of OPEN reqs and
-- the companies that have them. Gated to `app_tenant() IS NULL`, so this NEVER
-- widens access for a signed-in tenant (their queries always set app.tenant).
drop policy if exists public_open_req on requisition;
create policy public_open_req on requisition for select
  using (status = 'Open' and app_tenant() is null);

drop policy if exists public_company on tenant;
create policy public_company on tenant for select
  using (app_tenant() is null and exists (select 1 from requisition r where r.tenant_id = tenant.id and r.status = 'Open'));
