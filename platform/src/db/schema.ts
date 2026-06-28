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
