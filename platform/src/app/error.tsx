"use client";

// Friendly error boundary for any page throw (renders inside the app shell).
// Prevents users ever seeing a raw "Application error" digest screen — the most
// common cause is a half-finished sign-in / expired session, so we offer both a
// retry and a clean route back to sign-in.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 23, fontWeight: 700, color: "#241a40", margin: "0 0 10px" }}>Something went wrong</h1>
          <p style={{ color: "#6b6b70", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
            We couldn&apos;t load this page. This usually happens if your session expired or your sign-in didn&apos;t finish.
            Try again, or sign in once more.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22 }}>
            <button
              onClick={() => reset()}
              style={{ background: "#241a40", color: "#fff", border: 0, padding: "10px 20px", borderRadius: 980, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
            <a
              href="/sign-in"
              style={{ background: "#e8f1fd", color: "#0059b8", padding: "10px 20px", borderRadius: 980, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              Sign in again
            </a>
          </div>
          {error?.digest && <p style={{ color: "#9a9aa6", fontSize: 11, marginTop: 18 }}>Reference: {error.digest}</p>}
        </div>
      </div>
    </main>
  );
}
