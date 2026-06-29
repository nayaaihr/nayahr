import type Anthropic from "@anthropic-ai/sdk";
import { listPeople, type PersonRow } from "@/repos/people";
import { createRequisition, addCandidate, listRecruitment } from "@/repos/recruit";
import { requestCompChange } from "@/repos/comp";
import { requestLeave } from "@/repos/leave";
import type { Session } from "@/db/client";

/**
 * AI tools that run SERVER-SIDE against the database, through the same
 * RLS + role-scoped repo (`listPeople`) the UI uses. The model can only ever
 * compute over rows the signed-in user is permitted to see — tenant isolation
 * and role scope are enforced by Postgres, not by the prompt.
 */
export const TOOLS = [
  {
    name: "headcount",
    description: "Count employees the signed-in user can see, optionally grouped by department, location, or status.",
    input_schema: {
      type: "object",
      properties: {
        group_by: { type: "string", enum: ["department", "location", "status"] },
        status: { type: "string", enum: ["Active", "Terminated"] },
      },
    },
  },
  {
    name: "find_employees",
    description: "List employees matching filters (name, department, title, location, status). Returns up to 50.",
    input_schema: {
      type: "object",
      properties: {
        name_contains: { type: "string" },
        department: { type: "string" },
        title_contains: { type: "string" },
        location: { type: "string" },
        status: { type: "string", enum: ["Active", "Terminated"] },
      },
    },
  },
  {
    name: "salary_summary",
    description: "Average / min / max / total annual salary (INR) over the visible active employees, optionally grouped by department or location.",
    input_schema: {
      type: "object",
      properties: { group_by: { type: "string", enum: ["department", "location"] } },
    },
  },
  {
    name: "create_requisition",
    description: "Create a new job requisition (open role). A manager's requisition is sent to HR for approval; HR/owner requisitions open immediately. Use when the user asks to open or create a role/requisition.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Role title, e.g. 'Marketing Director'" },
        department: { type: "string" },
        location: { type: "string", description: "e.g. Zurich, Bengaluru" },
        openings: { type: "number", description: "Number of positions (default 1)" },
        description: { type: "string", description: "Free-text notes about the role (context, must-have skills, why hiring)" },
      },
      required: ["title"],
    },
  },
  {
    name: "add_candidate",
    description: "Add a candidate to an existing OPEN requisition; they enter the pipeline at the 'Applied' stage. Use when the user wants to add an applicant to a role.",
    input_schema: {
      type: "object",
      properties: {
        requisition_title: { type: "string", description: "Title of the open requisition to add the candidate to" },
        name: { type: "string", description: "Candidate full name" },
        email: { type: "string" },
        source: { type: "string", description: "e.g. LinkedIn, Referral, Naukri, Agency" },
      },
      required: ["requisition_title", "name"],
    },
  },
  {
    name: "request_comp_change",
    description: "Request a compensation (pay) change for an employee. It goes to HR for approval; on approval it's recorded as an effective-dated change. Use when the user asks to change or raise someone's salary.",
    input_schema: {
      type: "object",
      properties: {
        employee_name: { type: "string" },
        new_amount_inr: { type: "number", description: "New ANNUAL salary in INR (a plain number, e.g. 2500000)" },
        effective_date: { type: "string", description: "YYYY-MM-DD (defaults to today)" },
        reason: { type: "string", description: "e.g. Annual increment, Promotion" },
      },
      required: ["employee_name", "new_amount_inr"],
    },
  },
  {
    name: "request_leave",
    description: "Submit a time-off request for the signed-in employee. Use when the user asks to apply for or request leave.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Leave type, e.g. Casual, Sick, Earned (Privilege), Maternity, Paternity" },
        from_date: { type: "string", description: "Start date YYYY-MM-DD" },
        days: { type: "number" },
      },
      required: ["type", "from_date", "days"],
    },
  },
] satisfies Anthropic.Tool[];

export function buildSystem(s: Session): string {
  const scope =
    s.role === "employee" ? "ONLY your own record"
    : s.role === "manager" ? "ONLY your direct reports"
    : "the whole organisation";
  return [
    "You are the NayaHR assistant, embedded in an HRIS for an Indian SMB.",
    `The signed-in user's role is ${s.role}; the data is automatically limited to ${scope} — the database enforces this, so just answer from whatever the tools return.`,
    "Salaries are annual amounts in Indian Rupees (INR); present money in lakhs (e.g. ₹6.0L) or crores.",
    "Always use the tools for real numbers; never invent figures. Be concise and lead with the answer.",
    "You can also TAKE ACTIONS on the user's behalf when they clearly ask: create a job requisition, add a candidate to an open role, request a pay change, or request leave — using the write tools. The database enforces who is allowed to do what, so if a tool returns an error about permissions or scope, relay it plainly. Never take an action the user didn't ask for.",
    "After performing an action, confirm in one sentence exactly what you did, and mention if it now needs approval (e.g. a manager's requisition or any pay change goes to HR).",
    "Respond with only the final answer — no preamble or exploratory reasoning.",
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
  ].join(" ");
}

const num = (x: string | null) => (x ? Number(x) : 0);
const activeOnly = (rows: PersonRow[]) => rows.filter((p) => p.employment_status === "Active");

export async function runTool(name: string, input: Record<string, unknown>, s: Session): Promise<unknown> {
  const people = await listPeople(s); // RLS + role scoped — the security boundary
  const dimKey = (d: unknown): keyof PersonRow =>
    d === "location" ? "location" : d === "status" ? "employment_status" : "department";

  if (name === "headcount") {
    const rows = input.status ? people.filter((p) => p.employment_status === input.status) : activeOnly(people);
    if (input.group_by) {
      const key = dimKey(input.group_by);
      const counts: Record<string, number> = {};
      rows.forEach((p) => { const k = String(p[key] ?? "—"); counts[k] = (counts[k] || 0) + 1; });
      return { group_by: input.group_by, total: rows.length, counts };
    }
    return { count: rows.length };
  }

  if (name === "find_employees") {
    let rows = input.status ? people.filter((p) => p.employment_status === input.status) : activeOnly(people);
    if (input.department) rows = rows.filter((p) => p.department === input.department);
    if (input.location) rows = rows.filter((p) => p.location === input.location);
    if (input.title_contains) rows = rows.filter((p) => p.title.toLowerCase().includes(String(input.title_contains).toLowerCase()));
    if (input.name_contains) rows = rows.filter((p) => p.full_name.toLowerCase().includes(String(input.name_contains).toLowerCase()));
    return {
      matched: rows.length,
      employees: rows.slice(0, 50).map((p) => ({
        name: p.full_name, title: p.title, department: p.department,
        location: p.location, status: p.employment_status, salary_inr: num(p.salary),
      })),
    };
  }

  if (name === "salary_summary") {
    const calc = (rs: PersonRow[]) => {
      const a = rs.map((p) => num(p.salary)).filter((n) => n > 0);
      if (!a.length) return null;
      const total = a.reduce((s2, x) => s2 + x, 0);
      return { count: a.length, average_inr: Math.round(total / a.length), min_inr: Math.min(...a), max_inr: Math.max(...a), total_inr: total };
    };
    const rows = activeOnly(people);
    if (input.group_by) {
      const key = dimKey(input.group_by);
      const groups: Record<string, PersonRow[]> = {};
      rows.forEach((p) => { const k = String(p[key] ?? "—"); (groups[k] = groups[k] || []).push(p); });
      const results: Record<string, unknown> = {};
      Object.keys(groups).sort().forEach((k) => { results[k] = calc(groups[k]); });
      return { group_by: input.group_by, results };
    }
    return calc(rows);
  }

  // ── Write tools — execute through the role-scoped repos (RBAC + audit) ──────
  const resolveWorker = (q: unknown): { worker: PersonRow } | { error: string } => {
    const matches = people.filter((p) => p.full_name.toLowerCase().includes(String(q ?? "").toLowerCase()));
    if (matches.length === 0) return { error: `No employee found matching "${q}".` };
    if (matches.length > 1) return { error: `Multiple employees match "${q}": ${matches.slice(0, 5).map((m) => m.full_name).join(", ")}. Please be more specific.` };
    return { worker: matches[0] };
  };
  const fail = (e: unknown) => ({ error: e instanceof Error ? e.message : "Action failed." });

  if (name === "create_requisition") {
    try {
      await createRequisition(s, {
        title: String(input.title), department: input.department ? String(input.department) : null,
        location: input.location ? String(input.location) : null, openings: Number(input.openings) || 1,
        description: input.description ? String(input.description) : null,
      });
      return { ok: true, message: `Requisition "${input.title}" created${s.role === "manager" ? " and sent to HR for approval" : " and opened"}.` };
    } catch (e) { return fail(e); }
  }

  if (name === "add_candidate") {
    const { reqs } = await listRecruitment(s);
    const open = reqs.filter((r) => r.status === "Open");
    const match = open.filter((r) => r.title.toLowerCase().includes(String(input.requisition_title ?? "").toLowerCase()));
    if (match.length === 0) return { error: `No OPEN requisition matching "${input.requisition_title}". Open roles: ${open.map((r) => r.title).join(", ") || "none"}.` };
    if (match.length > 1) return { error: `Multiple open requisitions match: ${match.map((r) => r.title).join(", ")}. Please be specific.` };
    try {
      await addCandidate(s, { reqId: match[0].id, name: String(input.name), email: input.email ? String(input.email) : "", source: input.source ? String(input.source) : "" });
      return { ok: true, message: `Added ${input.name} to "${match[0].title}" at the Applied stage.` };
    } catch (e) { return fail(e); }
  }

  if (name === "request_comp_change") {
    const r = resolveWorker(input.employee_name);
    if ("error" in r) return r;
    try {
      await requestCompChange(s, {
        workerId: r.worker.worker_id, newAmount: Number(input.new_amount_inr),
        effectiveDate: input.effective_date ? String(input.effective_date) : new Date().toISOString().slice(0, 10),
        reason: input.reason ? String(input.reason) : "",
      });
      return { ok: true, message: `Pay change for ${r.worker.full_name} to ₹${Number(input.new_amount_inr).toLocaleString("en-IN")} submitted for HR approval.` };
    } catch (e) { return fail(e); }
  }

  if (name === "request_leave") {
    try {
      await requestLeave(s, { type: String(input.type), fromDate: String(input.from_date), days: Number(input.days) || 1 });
      return { ok: true, message: `Leave request (${input.type}, ${input.days} day(s) from ${input.from_date}) submitted for approval.` };
    } catch (e) { return fail(e); }
  }

  return { error: `Unknown tool: ${name}` };
}
