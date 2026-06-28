import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";

export type ImportResult = { imported: number; errors: string[] };

// Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY (India common). Falls back to today.
function normalizeDate(s: string): string {
  const v = (s || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Bulk import a roster from CSV text. HR Admin / Owner only.
 * Each row -> worker + dated Hire job_event + compensation_event (effective-dated
 * + audited), creating departments/locations by name on the fly. Each row runs in
 * its own transaction so one bad row doesn't sink the whole import.
 *
 * Note: simple comma split — no quoted-field support yet (use a CSV lib later).
 */
export async function importEmployees(s: Session, csv: string): Promise<ImportResult> {
  if (s.role !== "hr_admin" && s.role !== "owner") {
    throw new Error("Not authorized — only HR Admin or Owner can import.");
  }
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one employee row.");

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => {
    for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
    return -1;
  };
  const ci = {
    name: col(["name", "full name", "full_name", "employee", "employee name"]),
    title: col(["title", "designation", "role", "job title"]),
    dept: col(["department", "dept"]),
    loc: col(["location", "city", "office"]),
    salary: col(["salary", "annual salary", "ctc", "annual ctc"]),
    hire: col(["hire date", "hire_date", "hired_on", "doj", "date of joining", "joining date"]),
    email: col(["email", "email id", "email address"]),
  };
  if (ci.name < 0) throw new Error('CSV must have a "name" column.');

  const deptCache: Record<string, string> = {};
  const locCache: Record<string, string> = {};
  const errors: string[] = [];
  let imported = 0;

  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r].split(",");
    const get = (i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");
    const name = get(ci.name);
    if (!name) continue;

    try {
      await withSession(s, async (tx) => {
        const resolve = async (cache: Record<string, string>, table: "department" | "location", raw: string) => {
          const k = raw.trim();
          if (!k) return null;
          if (cache[k]) return cache[k];
          const found = await tx.execute(sql`select id from ${sql.raw(table)} where lower(name) = lower(${k}) limit 1`);
          let id = (found.rows as Array<{ id: string }>)[0]?.id;
          if (!id) {
            const ins = await tx.execute(sql`insert into ${sql.raw(table)} (tenant_id, name) values (${s.tenantId}, ${k}) returning id`);
            id = (ins.rows as Array<{ id: string }>)[0].id;
          }
          cache[k] = id;
          return id;
        };

        const departmentId = await resolve(deptCache, "department", get(ci.dept));
        const locationId = await resolve(locCache, "location", get(ci.loc));
        const hired = normalizeDate(get(ci.hire));
        const salary = parseInt(get(ci.salary).replace(/[^0-9]/g, ""), 10) || 0;

        const w = await tx.execute(sql`
          insert into worker (tenant_id, full_name, email, hired_on)
          values (${s.tenantId}, ${name}, ${get(ci.email) || null}, ${hired}::date) returning id
        `);
        const workerId = (w.rows as Array<{ id: string }>)[0].id;

        await tx.execute(sql`
          insert into job_event (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, location_id, employment_status, recorded_by)
          values (${s.tenantId}, ${workerId}, ${hired}::date, 0, 'Hire', ${get(ci.title) || "Employee"}, ${departmentId}, ${locationId}, 'Active', ${s.userId})
        `);
        await tx.execute(sql`
          insert into compensation_event (tenant_id, worker_id, effective_date, seq, amount, currency, recorded_by)
          values (${s.tenantId}, ${workerId}, ${hired}::date, 0, ${salary}, 'INR', ${s.userId})
        `);
      });
      imported++;
    } catch (e) {
      errors.push(`Row ${r + 1} (${name}): ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  // One audit row summarising the import.
  try {
    await withSession(s, async (tx) => {
      await tx.execute(sql`
        insert into audit_log (tenant_id, actor_id, action, entity, after)
        values (${s.tenantId}, ${s.userId}, 'import', 'worker', ${JSON.stringify({ imported, errors: errors.length })}::jsonb)
      `);
    });
  } catch { /* non-fatal */ }

  return { imported, errors };
}
