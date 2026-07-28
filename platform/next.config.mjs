import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep pg server-only (avoid bundling its dynamic requires). Next 14.2 key.
  experimental: {
    serverComponentsExternalPackages: ["pg"],
    instrumentationHook: true, // enable src/instrumentation.ts on Next 14.2
  },
};

// Sentry wraps the build. Source-map upload only happens when SENTRY_AUTH_TOKEN
// (+ org/project) are set; otherwise it's a harmless no-op and the runtime SDK
// still reports errors once a DSN is configured.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  disableLogger: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
