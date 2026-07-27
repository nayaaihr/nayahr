"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import { BrandLockup } from "./brand-mark";

/** Shown to a signed-in user who has no workspace and wasn't invited. */
export function NoWorkspace() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "";
  return (
    <div className="jobcard" style={{ textAlign: "center", maxWidth: 460 }}>
      <BrandLockup tagline="" />
      <h1 style={{ fontSize: 21, margin: "4px 0 10px" }}>You need an invitation</h1>
      <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
        You&apos;re signed in{email ? <> as <strong>{email}</strong></> : ""}, but this account isn&apos;t part of any company on NayaHR yet.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.6, marginTop: 10 }}>
        Ask your HR admin to invite <strong>{email || "your email"}</strong> from the <strong>People</strong> page, then sign in again with this same email.
      </p>
      <div style={{ marginTop: 22 }}>
        <SignOutButton><button className="btn">Sign out</button></SignOutButton>
      </div>
    </div>
  );
}
