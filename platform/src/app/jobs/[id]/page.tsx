import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPublicJob } from "@/repos/public-jobs";
import { ShareLinkedIn } from "@/app/share-linkedin";
import { JobDescription } from "./job-description";

export const dynamic = "force-dynamic";

const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
// Dedupe the DB read across generateMetadata + the page render (one request).
const getJob = cache(getPublicJob);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await getJob(params.id);
  if (!job) return { title: "Position not available — NayaHR", robots: { index: false, follow: true } };
  const title = `${job.title} at ${job.company}`;
  const bits = [job.department, job.location].filter(Boolean).join(" · ");
  const description = (job.description?.replace(/\s+/g, " ").trim().slice(0, 155))
    || `${job.company} is hiring: ${job.title}${bits ? ` (${bits})` : ""}. Apply via NayaHR.`;
  const url = `https://app.nayahr.in/jobs/${params.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true }, // overrides the app-wide noindex for public job pages
    openGraph: { title, description, url, type: "website", siteName: "NayaHR", images: ["https://nayahr.in/og.png"] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function JobPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);

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

  // JobPosting structured data → eligibility for Google Jobs. Only http(s) logos
  // are usable (stored logos are data: URLs, so omitted). "<" is escaped to
  // < so a description can't break out of the <script>.
  const descHtml = job.description
    ? `<p>${esc(job.description).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>`
    : `<p>${esc(job.company)} is hiring for the role of ${esc(job.title)}.</p>`;
  const jobPosting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: descHtml,
    datePosted: job.postedAt ?? new Date().toISOString().slice(0, 10),
    identifier: { "@type": "PropertyValue", name: job.company, value: params.id },
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      ...(job.logoUrl && /^https?:\/\//.test(job.logoUrl) ? { logo: job.logoUrl } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(job.location ? { addressLocality: job.location } : {}),
        addressCountry: "IN",
      },
    },
    ...(job.openings > 1 ? { totalJobOpenings: job.openings } : {}),
  };

  return (
    <div className="jobcard">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting).replace(/</g, "\\u003c") }} />
      <div className="job-brand">
        {job.logoUrl ? <img src={job.logoUrl} alt={job.company} /> : <span className="mark">{initials(job.company)}</span>}
        <span>{job.company}</span>
      </div>
      <span className="pill green">We&apos;re hiring</span>
      <h1>{job.title}</h1>
      <div className="job-meta">{meta}</div>
      {job.description && <JobDescription text={job.description} />}
      <div className="job-cta">
        <ShareLinkedIn reqId={params.id} primary />
      </div>
      <div className="job-foot">
        Posted with <Link href="https://nayahr.in">NayaHR</Link> — the AI-native HRIS for Indian businesses.
      </div>
    </div>
  );
}
