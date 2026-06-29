-- NayaHR — Goals lifecycle: performance year + employee→manager approval. Additive.
alter table goal add column if not exists cycle           text not null default 'FY 2026-27';
alter table goal add column if not exists stage           text not null default 'Draft'; -- Draft | Submitted | Approved | Rejected
alter table goal add column if not exists manager_comment text;
