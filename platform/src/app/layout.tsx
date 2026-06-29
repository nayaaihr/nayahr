import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { SideNav } from "./sidenav";
import { Assistant } from "./people/assistant";
import { DevSwitcher } from "./dev-switcher";
import { ProfileChip } from "./profile-chip";
import { CompanyBrand } from "./company-brand";
import { getSession } from "@/lib/session";
import { inboxCount } from "@/repos/inbox";
import { getCompany } from "@/repos/company";
import "./globals.css";

export const metadata: Metadata = {
  title: "NayaHR — Platform",
  description: "AI-native HRIS",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve role + company + inbox count (all fail gracefully when signed out).
  let role: string | null = null;
  let canViewAs = false;
  let pending = 0;
  let company = { name: "NayaHR", logoUrl: null as string | null };
  try {
    const session = await getSession();
    role = session.role;
    // Owner can preview lower roles in any env; everyone can in dev.
    canViewAs = session.realRole === "owner" || process.env.NODE_ENV !== "production";
    [pending, company] = await Promise.all([inboxCount(session), getCompany(session)]);
  } catch { /* not signed in — auth pages render without the app shell */ }
  const canEditLogo = role === "owner" || role === "hr_admin";

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {/* Signed in → full app shell with sidebar. */}
          <SignedIn>
            <div className="app">
              <aside className="side">
                <CompanyBrand name={company.name} logoUrl={company.logoUrl} canEdit={canEditLogo} />
                <SideNav role={role} inboxCount={pending} />
                <div className="side-foot">
                  <ProfileChip />
                  {canViewAs && role && <DevSwitcher current={role} />}
                  <UserButton showName />
                </div>
              </aside>
              <div className="main">{children}</div>
            </div>
            {role && <Assistant role={role} />}
          </SignedIn>

          {/* Signed out → clean, centered auth page (no sidebar/nav leaking in). */}
          <SignedOut>
            <div className="auth-shell">{children}</div>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
