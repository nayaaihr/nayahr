-- NayaHR — employee portal invites. A pending app_user (clerk_user_id NULL) is
-- created by HR. On sign-in, the user may find + claim ONLY the pending row that
-- matches their Clerk-verified email (set via the app.clerk_email GUC).
drop policy if exists app_user_invite_select on app_user;
create policy app_user_invite_select on app_user for select
  using (clerk_user_id is null and lower(email) = lower(current_setting('app.clerk_email', true)));

drop policy if exists app_user_invite_claim on app_user;
create policy app_user_invite_claim on app_user for update
  using (clerk_user_id is null and lower(email) = lower(current_setting('app.clerk_email', true)))
  with check (clerk_user_id = current_setting('app.clerk_user', true)
              and lower(email) = lower(current_setting('app.clerk_email', true)));

create index if not exists app_user_pending_email_idx on app_user (lower(email)) where clerk_user_id is null;
