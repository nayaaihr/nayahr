import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { SideNav } from "./sidenav";
import { Assistant } from "./people/assistant";
import { DevSwitcher } from "./dev-switcher";
import { ProfileChip } from "./profile-chip";
import { CompanyBrand } from "./company-brand";
import { CompanySetupBanner } from "./company-setup-banner";
import { getSession, NoWorkspaceError } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superadmin";
import { NoWorkspace } from "./no-workspace";
import { inboxCount } from "@/repos/inbox";
import { getCompany } from "@/repos/company";
import { listPersonaOptions, type PersonaOpt } from "@/repos/profile";
import { clerkAppearance } from "./clerk-appearance";
import "./globals.css";

export const metadata: Metadata = {
  title: "NayaHR — Platform",
  description: "AI-native HRIS",
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23241a40'/%3E%3Cline x1='11' y1='10' x2='11' y2='22' stroke='%23ffffff' stroke-width='5.2' stroke-linecap='round'/%3E%3Cline x1='21' y1='13' x2='21' y2='22' stroke='%23ffffff' stroke-width='5.2' stroke-linecap='round'/%3E%3Cline x1='11' y1='21' x2='21' y2='11' stroke='%23ec6a49' stroke-width='5.2' stroke-linecap='round'/%3E%3Ccircle cx='21' cy='8' r='2.8' fill='%23ec6a49'/%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve role + company + inbox count (all fail gracefully when signed out).
  let role: string | null = null;
  let canViewAs = false;
  let pending = 0;
  let company = { name: "NayaHR", logoUrl: null as string | null, nameConfirmed: true };
  let currentWorkerId: string | null = null;
  let managers: PersonaOpt[] = [];
  let employees: PersonaOpt[] = [];
  let noWorkspace = false;
  try {
    const session = await getSession();
    role = session.role;
    currentWorkerId = session.workerId;
    // Owner can preview lower roles in any env; everyone can in dev.
    canViewAs = session.realRole === "owner" || process.env.NODE_ENV !== "production";
    const [p, c] = await Promise.all([inboxCount(session), getCompany(session)]);
    pending = p; company = c;
    if (canViewAs) { const o = await listPersonaOptions(session); managers = o.managers; employees = o.employees; }
  } catch (e) {
    // Signed in but not invited to any workspace → show the request-invite screen.
    if (e instanceof NoWorkspaceError) noWorkspace = true;
    /* otherwise: not signed in — auth pages render without the app shell */
  }
  const canEditLogo = role === "owner" || role === "hr_admin";
  const superAdmin = await isSuperAdmin(); // provider staff — cross-tenant console link

  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <body>
          {/* Signed in → full app shell with sidebar, unless the account has no
              workspace (not invited) — then show the request-invite screen. */}
          <SignedIn>
            {noWorkspace ? (
              <div className="auth-shell"><NoWorkspace /></div>
            ) : (
              <>
                <div className="app">
                  <aside className="side">
                    <CompanyBrand name={company.name} logoUrl={company.logoUrl} canEdit={canEditLogo} />
                    <SideNav role={role} inboxCount={pending} superAdmin={superAdmin} />
                    <div className="side-foot">
                      <ProfileChip />
                      {canViewAs && role && <DevSwitcher current={role} currentWorkerId={currentWorkerId} managers={managers} employees={employees} />}
                      <UserButton showName />
                    </div>
                  </aside>
                  <div className="main">
                    {(role === "owner" || role === "hr_admin") && !company.nameConfirmed && <CompanySetupBanner current={company.name} />}
                    {children}
                  </div>
                </div>
                {role && <Assistant role={role} />}
              </>
            )}
          </SignedIn>

          {/* Signed out → clean, centered auth page (no sidebar/nav leaking in). */}
          <SignedOut>
            <div className="auth-shell">
              {children}
              <footer style={{ position: "fixed", bottom: 0, left: 0, right: 0, textAlign: "center", padding: "16px", fontSize: 12.5, color: "#6b6b70" }}>
                <a href="https://nayahr.in/privacy" style={{ color: "#6b6b70", textDecoration: "none" }}>Privacy</a>
                <span style={{ margin: "0 8px" }}>·</span>
                <a href="https://nayahr.in/terms" style={{ color: "#6b6b70", textDecoration: "none" }}>Terms</a>
              </footer>
            </div>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
