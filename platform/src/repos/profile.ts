import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";

export type MyProfile = { name: string; photoUrl: string | null };

/** The signed-in user's own worker profile (name + avatar), or null if they
 *  aren't linked to a worker record (e.g. an owner/HR admin with no employee row). */
export async function getMyProfile(s: Session): Promise<MyProfile | null> {
  if (!s.workerId) return null;
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select full_name, photo_url from worker where id = ${s.workerId} limit 1`)).rows as Array<{ full_name: string; photo_url: string | null }>;
    if (!r[0]) return null;
    return { name: r[0].full_name, photoUrl: r[0].photo_url };
  });
}

/** Save (or clear) the signed-in user's profile photo. Stored as a small data URL. */
export async function setMyAvatar(s: Session, dataUrl: string | null): Promise<void> {
  if (!s.workerId) throw new Error("No employee profile to attach a photo to.");
  if (dataUrl !== null) {
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(dataUrl)) throw new Error("Please upload a PNG, JPG or WEBP image.");
    if (dataUrl.length > 300_000) throw new Error("Image is too large — please use a smaller photo.");
  }
  await withSession(s, async (tx) => {
    await tx.execute(sql`update worker set photo_url = ${dataUrl} where id = ${s.workerId}`);
  });
}
