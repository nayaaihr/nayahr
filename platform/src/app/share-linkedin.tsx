"use client";

/** Opens LinkedIn's share dialog pre-filled with the role's public /jobs URL.
 *  No LinkedIn API/partnership needed — this is the standard share endpoint. */
export function ShareLinkedIn({ reqId, primary = false }: { reqId: string; primary?: boolean }) {
  function share() {
    const url = `${window.location.origin}/jobs/${reqId}`;
    const link = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(link, "_blank", "noopener,noreferrer,width=620,height=680");
  }
  return (
    <button className={primary ? "btn" : "btn ghost sm"} onClick={share} title="Share this role on LinkedIn">
      Share on LinkedIn
    </button>
  );
}
