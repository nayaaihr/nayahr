-- NH-105: per-employee bank + statutory identifiers, needed for the bank NEFT
-- file and the PF/ESI/PT/TDS filing summary. All nullable (filled by HR over time).
alter table worker add column if not exists bank_account text;
alter table worker add column if not exists bank_ifsc    text;
alter table worker add column if not exists pan          text;
alter table worker add column if not exists uan          text;
