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
