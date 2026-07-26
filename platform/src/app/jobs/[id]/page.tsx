import Link from "next/link";
import { getPublicJob } from "@/repos/public-jobs";
import { ShareLinkedIn } from "@/app/share-linkedin";

export const dynamic = "force-dynamic";

const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

export default async function JobPage({ params }: { params: { id: string } }) {
  const job = await getPublicJob(params.id);

  if (!job) {
    return (
      <div className="jobcard">
        <h1 style={{ marginTop: 0 }}>Position not available</h1>
        <p style={{ color: "var(--muted)", marginBottom: 22 }}>This role may have been filled or is no longer open.</p>
        <a className="btn" href="https://nayahr.in">Visit NayaHR</a>
      </div>
    );
  }

  const meta = [job.department, job.location, job.openings > 1 ? `${job.openings} openings` : "1 opening"].filter(Boolean).join("  ·  ");

  return (
    <div className="jobcard">
      <div className="job-brand">
        {job.logoUrl ? <img src={job.logoUrl} alt={job.company} /> : <span className="mark">{initials(job.company)}</span>}
        <span>{job.company}</span>
      </div>
      <span className="pill green">We&apos;re hiring</span>
      <h1>{job.title}</h1>
      <div className="job-meta">{meta}</div>
      {job.description && <p className="job-desc">{job.description}</p>}
      <div className="job-cta">
        <ShareLinkedIn reqId={params.id} primary />
      </div>
      <div className="job-foot">
        Posted with <Link href="https://nayahr.in">NayaHR</Link> — the AI-native HRIS for Indian businesses.
      </div>
    </div>
  );
}
