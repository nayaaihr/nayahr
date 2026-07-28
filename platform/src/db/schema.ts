// Drizzle schema — typed source of truth, kept in sync with sql/0000_init.sql.
import {
  pgTable, uuid, text, date, integer, timestamp, numeric, jsonb, boolean, unique,
} from "drizzle-orm/pg-core";

export const tenant = pgTable("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  country: text("country").notNull().default("IN"),
  clerkOrgId: text("clerk_org_id"), // maps a Clerk Organization -> tenant (Phase 2)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  email: text("email").notNull(),
  role: text("role").notNull(), // owner | hr_admin | manager | employee
  workerId: uuid("worker_id"),
  clerkUserId: text("clerk_user_id"), // maps a Clerk user -> app_user (Phase 2)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.tenantId, t.email) }));

export const department = pgTable("department", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  name: text("name").notNull(),
});

export const location = pgTable("location", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  name: text("name").notNull(),
});

export const worker = pgTable("worker", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  fullName: text("full_name").notNull(),
  email: text("email"),
  hiredOn: date("hired_on").notNull(),
  // Payroll: bank + statutory identifiers (NH-105). Nullable — filled by HR over time.
  bankAccount: text("bank_account"),
  bankIfsc: text("bank_ifsc"),
  upiId: text("upi_id"),
  pan: text("pan"),
  uan: text("uan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobEvent = pgTable("job_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  workerId: uuid("worker_id").notNull().references(() => worker.id),
  effectiveDate: date("effective_date").notNull(),
  seq: integer("seq").notNull().default(0),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  departmentId: uuid("department_id").references(() => department.id),
  locationId: uuid("location_id").references(() => location.id),
  managerId: uuid("manager_id").references(() => worker.id),
  employmentStatus: text("employment_status").notNull().default("Active"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  recordedBy: uuid("recorded_by"),
  isCorrection: boolean("is_correction").notNull().default(false),
}, (t) => ({ uq: unique().on(t.tenantId, t.workerId, t.effectiveDate, t.seq) }));

export const compensationEvent = pgTable("compensation_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  workerId: uuid("worker_id").notNull().references(() => worker.id),
  effectiveDate: date("effective_date").notNull(),
  seq: integer("seq").notNull().default(0),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  frequency: text("frequency").notNull().default("annual"),
  components: jsonb("components"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  recordedBy: uuid("recorded_by"),
  isCorrection: boolean("is_correction").notNull().default(false),
}, (t) => ({ uq: unique().on(t.tenantId, t.workerId, t.effectiveDate, t.seq) }));

export const review = pgTable("review", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  workerId: uuid("worker_id").notNull().references(() => worker.id),
  selfStatus: text("self_status").notNull().default("Not started"),
  mgrStatus: text("mgr_status").notNull().default("Not started"),
  rating: integer("rating"),
  stage: text("stage").notNull().default("Self-review"),       // Self-review | Manager review | HR review | Closed
  selfText: text("self_text"),
  managerComment: text("manager_comment"),
  hrStatus: text("hr_status").notNull().default("Pending"),     // Pending | Acknowledged
  hrComment: text("hr_comment"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.tenantId, t.workerId) }));

export const goal = pgTable("goal", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  workerId: uuid("worker_id").notNull().references(() => worker.id),
  title: text("title").notNull(),
  progress: integer("progress").notNull().default(0),
  status: text("status").notNull().default("On track"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const requisition = pgTable("requisition", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  title: text("title").notNull(),
  department: text("department"),
  location: text("location"),
  openings: integer("openings").notNull().default(1),
  status: text("status").notNull().default("Open"),
  hiringManagerId: uuid("hiring_manager_id").references(() => worker.id),
  openedOn: date("opened_on").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const candidate = pgTable("candidate", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  reqId: uuid("req_id").notNull().references(() => requisition.id),
  name: text("name").notNull(),
  email: text("email"),
  stage: text("stage").notNull().default("Applied"),
  rating: integer("rating"),
  source: text("source"),
  offerAmount: numeric("offer_amount", { precision: 14, scale: 2 }),
  appliedOn: date("applied_on").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const compChangeRequest = pgTable("comp_change_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  workerId: uuid("worker_id").notNull().references(() => worker.id),
  currentAmount: numeric("current_amount"),
  newAmount: numeric("new_amount").notNull(),
  effectiveDate: date("effective_date").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("Pending"),
  requestedBy: uuid("requested_by"),
  decidedBy: uuid("decided_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const leaveRequest = pgTable("leave_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  workerId: uuid("worker_id").notNull().references(() => worker.id),
  type: text("type").notNull(),
  fromDate: date("from_date").notNull(),
  days: integer("days").notNull().default(1),
  status: text("status").notNull().default("Pending"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedBy: uuid("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const payrollRun = pgTable("payroll_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  period: date("period").notNull(), // first day of the pay month
  status: text("status").notNull().default("Draft"), // Draft | Finalized
  notes: text("notes"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finalizedBy: uuid("finalized_by"),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
}, (t) => ({ uq: unique().on(t.tenantId, t.period) }));

export const payslip = pgTable("payslip", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  runId: uuid("run_id").notNull().references(() => payrollRun.id),
  workerId: uuid("worker_id").notNull().references(() => worker.id),
  basic: numeric("basic", { precision: 14, scale: 2 }).notNull().default("0"),
  hra: numeric("hra", { precision: 14, scale: 2 }).notNull().default("0"),
  conveyance: numeric("conveyance", { precision: 14, scale: 2 }).notNull().default("0"),
  special: numeric("special", { precision: 14, scale: 2 }).notNull().default("0"),
  gross: numeric("gross", { precision: 14, scale: 2 }).notNull().default("0"),
  paidDays: numeric("paid_days", { precision: 5, scale: 1 }),
  lopDays: numeric("lop_days", { precision: 5, scale: 1 }).notNull().default("0"),
  lop: numeric("lop", { precision: 14, scale: 2 }).notNull().default("0"),
  pfEmployee: numeric("pf_employee", { precision: 14, scale: 2 }).notNull().default("0"),
  esiEmployee: numeric("esi_employee", { precision: 14, scale: 2 }).notNull().default("0"),
  pt: numeric("pt", { precision: 14, scale: 2 }).notNull().default("0"),
  tds: numeric("tds", { precision: 14, scale: 2 }).notNull().default("0"),
  employerPf: numeric("employer_pf", { precision: 14, scale: 2 }).notNull().default("0"),
  employerEsi: numeric("employer_esi", { precision: 14, scale: 2 }).notNull().default("0"),
  totalDeductions: numeric("total_deductions", { precision: 14, scale: 2 }).notNull().default("0"),
  net: numeric("net", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.tenantId, t.runId, t.workerId) }));

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
  actorId: uuid("actor_id"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  effectiveDate: date("effective_date"),
  before: jsonb("before"),
  after: jsonb("after"),
  requestId: text("request_id"),
});
