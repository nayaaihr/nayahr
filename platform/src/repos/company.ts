import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";

export type Company = { name: string; logoUrl: string | null };

/** The signed-in user's company (tenant) name + logo, for sidebar branding. */
export async function getCompany(s: Session): Promise<Company> {
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select name, logo_url from tenant where id = ${s.tenantId} limit 1`)).rows as Array<{ name: string; logo_url: string | null }>;
    return { name: r[0]?.name ?? "Company", logoUrl: r[0]?.logo_url ?? null };
  });
}

/** Rename the company (tenant) — HR/Owner only. Used on branding + payslips. */
export async function setCompanyName(s: Session, name: string): Promise<void> {
  if (!(s.role === "owner" || s.role === "hr_admin")) throw new Error("Only HR/Owner can rename the company.");
  const clean = name.trim();
  if (clean.length < 2) throw new Error("Enter a company name (at least 2 characters).");
  if (clean.length > 80) throw new Error("Company name is too long (max 80 characters).");
  await withSession(s, async (tx) => {
    await tx.execute(sql`update tenant set name = ${clean} where id = ${s.tenantId}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'company_rename', 'tenant', ${s.tenantId}, ${JSON.stringify({ name: clean })}::jsonb)`);
  });
}

/** Set (or clear) the company logo — HR/Owner only. Stored as a small data URL. */
export async function setCompanyLogo(s: Session, dataUrl: string | null): Promise<void> {
  if (!(s.role === "owner" || s.role === "hr_admin")) throw new Error("Only HR/Owner can change the company logo.");
  if (dataUrl !== null) {
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(dataUrl)) throw new Error("Please upload a PNG, JPG or WEBP image.");
    if (dataUrl.length > 400_000) throw new Error("Logo image is too large — use a smaller file.");
  }
  await withSession(s, async (tx) => {
    await tx.execute(sql`update tenant set logo_url = ${dataUrl} where id = ${s.tenantId}`);
  });
}
