import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";
import { parseRoster } from "@/lib/import-parse";

export type ImportResult = { imported: number; errors: string[] };

/**
 * Bulk import a roster from CSV text. HR Admin / Owner only.
 * Parsing + validation is shared with the preview (`parseRoster`), so what the
 * user previews is exactly what imports. Each row -> worker + dated Hire
 * job_event + compensation_event (effective-dated + audited), creating
 * departments/locations by name on the fly, each in its own transaction so one
 * bad row doesn't sink the whole import.
 */
export async function importEmployees(s: Session, csv: string): Promise<ImportResult> {
  if (s.role !== "hr_admin" && s.role !== "owner") {
    throw new Error("Not authorized — only HR Admin or Owner can import.");
  }
  const parsed = parseRoster(csv);
  if (parsed.error) throw new Error(parsed.error);

  const deptCache: Record<string, string> = {};
  const locCache: Record<string, string> = {};
  const errors: string[] = [];
  let imported = 0;

  for (const row of parsed.rows) {
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

        const departmentId = await resolve(deptCache, "department", row.dept);
        const locationId = await resolve(locCache, "location", row.loc);

        const w = await tx.execute(sql`
          insert into worker (tenant_id, full_name, email, hired_on)
          values (${s.tenantId}, ${row.name}, ${row.email || null}, ${row.hired}::date) returning id
        `);
        const workerId = (w.rows as Array<{ id: string }>)[0].id;

        await tx.execute(sql`
          insert into job_event (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, location_id, employment_status, recorded_by)
          values (${s.tenantId}, ${workerId}, ${row.hired}::date, 0, 'Hire', ${row.title || "Employee"}, ${departmentId}, ${locationId}, 'Active', ${s.userId})
        `);
        await tx.execute(sql`
          insert into compensation_event (tenant_id, worker_id, effective_date, seq, amount, currency, recorded_by)
          values (${s.tenantId}, ${workerId}, ${row.hired}::date, 0, ${row.salary}, 'INR', ${s.userId})
        `);
      });
      imported++;
    } catch (e) {
      errors.push(`Row ${row.rowNumber} (${row.name}): ${e instanceof Error ? e.message : "failed"}`);
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
