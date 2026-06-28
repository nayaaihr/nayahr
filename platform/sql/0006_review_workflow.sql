-- NayaHR — Performance review workflow (NH-036). Additive.
-- Adds self-assessment text, manager comment, HR acknowledgement, and a real stage.
alter table review add column if not exists self_text       text;
alter table review add column if not exists manager_comment text;
alter table review add column if not exists hr_status       text not null default 'Pending';   -- Pending | Acknowledged
alter table review add column if not exists hr_comment      text;
alter table review add column if not exists stage           text not null default 'Self-review'; -- Self-review | Manager review | HR review | Closed
