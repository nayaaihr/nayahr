import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { SideNav } from "./sidenav";
import { Assistant } from "./people/assistant";
import { DevSwitcher } from "./dev-switcher";
import { ProfileChip } from "./profile-chip";
import { getSession } from "@/lib/session";
import { inboxCount } from "@/repos/inbox";
import "./globals.css";

export const metadata: Metadata = {
  title: "NayaHR — Platform",
  description: "AI-native HRIS",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the role for the assistant + nav (null on auth pages / signed out).
  let role: string | null = null;
  let pending = 0;
  try {
    const session = await getSession();
    role = session.role;
    pending = await inboxCount(session);
  } catch { /* not signed in */ }
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <div className="app">
            <aside className="side">
              <div className="logo">
                <span className="mark">N</span>
                <div>
                  <div className="name">NayaHR</div>
                  <div className="tag">AI-native HRIS</div>
                </div>
              </div>
              <SideNav role={role} inboxCount={pending} />
              <div className="side-foot">
                <SignedIn>
                  <ProfileChip />
                </SignedIn>
                {process.env.NODE_ENV !== "production" && role && <DevSwitcher current={role} />}
                <SignedIn>
                  <UserButton showName />
                </SignedIn>
                <SignedOut>
                  <SignInButton>
                    <button className="signin-btn">Sign in</button>
                  </SignInButton>
                </SignedOut>
              </div>
            </aside>
            <div className="main">{children}</div>
          </div>
          {role && <Assistant role={role} />}
        </body>
      </html>
    </ClerkProvider>
  );
}
