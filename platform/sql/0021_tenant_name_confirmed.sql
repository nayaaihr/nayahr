-- Track whether a client has set/confirmed their own company name (vs the name
-- auto-guessed from their email at self-provision). Existing tenants default to
-- true (no onboarding prompt); self-provisioned tenants are set false in code.
alter table tenant add column if not exists name_confirmed boolean not null default true;
