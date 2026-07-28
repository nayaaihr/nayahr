-- NayaHR — payroll proration: record how many days of the month each payslip
-- was paid for (hire-date proration). Null on older rows (pre-proration).
alter table payslip add column if not exists paid_days numeric(5,1);
