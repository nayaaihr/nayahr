-- NayaHR — Phase 2 (auth): link Clerk identities to tenants/users.
-- Runs after 0000_init.sql (which drops+recreates tables) and 0001_rls.sql.

alter table tenant   add column if not exists clerk_org_id  text;
alter table app_user add column if not exists clerk_user_id text;
create index if not exists app_user_clerk_idx on app_user (clerk_user_id);

-- Self-membership policy: a signed-in user can always read their OWN app_user
-- row(s), regardless of the app.tenant GUC. This breaks the bootstrap chicken-
-- and-egg (we must read app_user to learn which tenant the user belongs to,
-- but tenant_isolation needs app.tenant). Permissive policies are OR'd, so this
-- is additive to tenant_isolation. Keyed by the app.clerk_user GUC.
create policy app_user_self on app_user
  using (clerk_user_id = nullif(current_setting('app.clerk_user', true), ''));
