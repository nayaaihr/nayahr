-- NayaHR — privileges for the dedicated app role `nayahr_app`.
-- WHY: Neon's default `neondb_owner` has BYPASSRLS, which silently disables
-- Row-Level Security (tenant isolation). The app must connect as a role that does
-- NOT bypass RLS. Create `nayahr_app` first (Neon Console → Roles → New Role,
-- name it exactly `nayahr_app`), then run this as the owner to grant privileges.
grant usage on schema public to nayahr_app;
grant select, insert, update, delete on all tables in schema public to nayahr_app;
grant usage, select on all sequences in schema public to nayahr_app;
grant execute on all functions in schema public to nayahr_app;
alter default privileges in schema public grant select, insert, update, delete on tables to nayahr_app;
alter default privileges in schema public grant usage, select on sequences to nayahr_app;
