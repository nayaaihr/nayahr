"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Last-resort boundary for errors thrown in the root layout itself (which the
// page-level error.tsx can't catch). Renders its own <html>/<body>, so all
// styles are inline.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]); // no-op without a DSN
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, Helvetica, sans-serif", background: "#f5f5f7" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 460, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 23, fontWeight: 700, color: "#241a40", margin: "0 0 10px" }}>Something went wrong</h1>
            <p style={{ color: "#6b6b70", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
              NayaHR hit an unexpected error. Please try again in a moment.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22 }}>
              <button
                onClick={() => reset()}
                style={{ background: "#241a40", color: "#fff", border: 0, padding: "10px 20px", borderRadius: 980, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{ background: "#e8f1fd", color: "#0059b8", padding: "10px 20px", borderRadius: 980, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
              >
                Reload NayaHR
              </a>
            </div>
            {error?.digest && <p style={{ color: "#9a9aa6", fontSize: 11, marginTop: 18 }}>Reference: {error.digest}</p>}
          </div>
        </div>
      </body>
    </html>
  );
}
