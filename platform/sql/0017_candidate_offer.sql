-- NayaHR — capture the offered salary on a candidate (set when an offer is made),
-- so hiring uses the real number instead of a hardcoded default.
alter table candidate add column if not exists offer_amount numeric(14,2);
