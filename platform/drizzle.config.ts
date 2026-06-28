import type { Config } from "drizzle-kit";

// Drizzle schema is the typed source of truth (src/db/schema.ts).
// For this slice we apply DDL via sql/*.sql (so we can include RLS + policies,
// which drizzle-kit does not generate). Going forward, `drizzle-kit generate`
// can derive table migrations from schema.ts and RLS stays in sql/.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
