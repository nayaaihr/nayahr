import { getSession } from "@/lib/session";
import { getMyProfile } from "@/repos/profile";
import { AvatarUpload } from "./avatar";

/** Workday-style profile chip with avatar upload, shown for the signed-in
 *  persona when they're linked to a worker record. Renders nothing otherwise. */
export async function ProfileChip() {
  let profile = null;
  try { profile = await getMyProfile(await getSession()); } catch { /* signed out */ }
  if (!profile) return null;
  return <AvatarUpload name={profile.name} photoUrl={profile.photoUrl} />;
}
