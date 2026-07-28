-- NH-105 follow-up: UPI ID as an alternative payout method (used when bank
-- account/IFSC isn't on file). Nullable — filled by HR per employee.
alter table worker add column if not exists upi_id text;
