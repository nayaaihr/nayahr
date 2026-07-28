# NayaHR — PWA (mobile app) plan

Goal: give employees a real **mobile experience** with the least effort and full backend reuse, by making the existing Next.js app a **mobile-responsive, installable Progressive Web App (PWA)**. App-store native (Capacitor/Expo) is a later phase.

_Created 2026-07-28. Owner: engineering. Scope decided with the user; approach = PWA first._

## Guiding scope
- **Employee self-service is the 80/20.** Optimise for: **payslips** (view/download), **leave** (apply + view balances), **inbox approvals** (manager/HR), **profile**. 
- **Keep desktop/web-only:** payroll runs, recruitment pipeline, compensation admin, reporting, the super-admin `/admin` console. Don't chase full parity.
- Reuse 100% of the backend (repos, RLS, Clerk). No new API layer needed for a PWA (server components/actions work as-is).

## Current constraints to design around
- The app shell is a **fixed left sidebar** (`src/app/layout.tsx` + `src/app/sidenav.tsx`) — desktop-oriented; needs a mobile pattern (bottom tab bar or slide-in drawer) under a breakpoint.
- Several pages use **wide tables** (People, Payroll run, Reports) — must scroll or stack on mobile.
- Auth is **Clerk** (works on mobile web already); the signed-out screen is centered and fine.
- Styling is a single `src/app/globals.css` design system with CSS variables — extend it responsively rather than rewriting.

## Phase 1 — Responsive + installable PWA (target: ~1–3 focused weeks)
1. **Mobile navigation.** Below ~768px, replace the sidebar with either a bottom tab bar (Inbox · People/Me · Payslips · Leave) or a hamburger drawer. Sidebar stays for desktop.
2. **Responsive pass on the key ESS flows:** employee profile (`/people/[id]` self-view), payslips list + payslip modal (`payslip-view.tsx`), `/leave` (apply + balances), `/inbox` (approve/reject). Make tables stack/scroll; ensure tap targets, spacing, and modals work on small screens.
3. **Web app manifest** (`app/manifest.ts` or `public/manifest.webmanifest`): name, short_name "NayaHR", theme/background color (navy `#241a40`), `display: standalone`, `start_url`, and **maskable icons** (192/512) generated from the logo mark.
4. **iOS support:** `apple-mobile-web-app-capable`, status-bar style, `apple-touch-icon` (iOS ignores the manifest for install).
5. **Service worker:** minimal offline shell — cache static assets + an offline fallback page. Do **not** cache authenticated data/API responses (RLS + freshness). Consider `next-pwa`/`@ducanh2912/next-pwa`, or a hand-written SW to keep deps light. Verify it doesn't break Clerk or server actions.
6. **Install affordance:** capture `beforeinstallprompt` and show an "Add to Home Screen" hint on mobile; document the iOS Share→Add flow.
7. **Verify on real mobile viewports** (browser tools mobile preset + a device). Check Lighthouse PWA installability.

## Phase 2 — later (only when clients ask / traction)
- **Capacitor** wrapper → Google Play (Indian users expect a Play Store listing) and App Store. Reuses the PWA. Adds native push.
- **Push notifications** (Expo Push / FCM+APNs) — the main reason to go beyond PWA. Requires a device-token store + a send path from approval events.
- A **React Native / Expo** native app is a bigger project and would need a dedicated **authenticated API layer** (the app currently uses server actions, not REST) — defer until scale/UX justifies a second codebase.

## Definition of done (Phase 1)
- Installable on Android (Chrome) and iOS (Safari Add to Home Screen); launches standalone with the NayaHR icon/splash.
- An employee can, on a phone: sign in, see their payslips and open one, view leave balances and apply, and (as a manager) approve a request from the inbox — all without horizontal scrolling or broken layout.
- Desktop experience unchanged. Tests still green; production build passes.

## How to start (new session)
Open Claude Code in this repo (loads `CLAUDE.md`), then: *"Let's build the NayaHR PWA — start Phase 1 from `docs/PWA-PLAN.md`."* Begin with mobile nav + the responsive pass, then manifest/SW/install.
