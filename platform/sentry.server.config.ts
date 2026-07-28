// Sentry (server runtime). No-op until SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is set,
// so nothing is sent until you create a Sentry project and add the DSN in Vercel.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
