# NayaHR — Launch Checklist

_"Launch" = onboarding our **first real paying client**. Grouped by urgency. Owner tags: **[Eng]** = build work · **[Biz]** = business/ops/legal._

_Last updated: July 2026._

---

## 🔴 Blockers — before we charge anyone

### Legal & data
- [ ] **[Biz] Terms of Service + Privacy Policy (DPDP-compliant).** We process employee PII *and* payroll — these must be live before a paying client. Use a lawyer or a solid India-SaaS template.
- [ ] **[Biz] Backups & recovery.** Move Neon to a paid plan and **verify point-in-time recovery** works. No restore path for payroll data = existential risk.
- [ ] **[Biz] Data-residency decision.** Host the prod DB in the Neon **Mumbai region** *before* loading real client data (moving later is painful; Indian buyers will ask).

### Commercial / ops
- [ ] **[Biz] Vercel Pro ($20/mo).** Hobby is non-commercial — required the moment money changes hands.
- [ ] **[Biz] Real `hello@nayahr.in` inbox** (Zoho Mail / Google Workspace). It's on the pricing sheet and needed for support.

### Engineering
- [x] **[Eng] Fix roster hire-date import.** ✅ Now parses `DD/MM/YY` (+ ISO, dot/dash separators, 2-digit-year pivot). _(NH-101, shipped Jul 2026.)_
- [ ] **[Eng] One-click "Create client workspace".** Replace the manual `SIGNUP_ALLOWLIST` + Clerk-invite dance with a single provisioning action. (Minimum: dry-run the manual process end-to-end once.)
- [x] **[Eng] Final RLS isolation re-test on prod.** ✅ 10/10 checks passed on prod (3 tenants; app role can't bypass RLS, default-deny, no cross-tenant read/write). _(NH-103 — re-run anytime with `npm run rls:verify`.)_

---

## 🟡 Strongly recommended — before the 2nd/3rd client

- [ ] **[Eng] Payroll bank export + statutory summary.** Payroll currently *computes* but stops there. Add a NEFT/CSV of net pay for the bank + a PF/ESI/PT/TDS totals sheet for filing. _(Biggest functional gap for a payroll product.)_
- [ ] **[Eng] Payroll correction / un-finalize path.** Finalize is one-way today; mistakes need a real fix (reversal or next-run adjustment).
- [ ] **[Biz/Eng] Error tracking + uptime monitoring** (e.g. Sentry + a status ping) — know it broke before the client does.
- [ ] **[Eng] CSV import: quoted-field support + a preview/validate step** — smoother, safer onboarding.
- [ ] **[Eng] Automated tests on the two things that must never silently break:** statutory payroll math and tenant isolation.

---

## 🟢 Later — not launch blockers

- [ ] Full **TDS engine** (declarations / regime choice), **Form 16 / 24Q**, **PF/ESI ECR challans**
- [ ] **Clerk Pro** to remove the "Secured by Clerk" footer (cosmetic)
- [ ] `nayahr.in → www` redirect cleanup (LinkedIn/OG previews)
- [ ] Interview scorecards (candidate rating was removed), org chart, richer analytics
- [ ] Toast notifications instead of `alert()`/`confirm()` (UX polish)
- [ ] Demo video / case studies for the site

---

## The shortest safe path to launch

**Business/legal blockers:** ToS + Privacy · backups + Mumbai region · Vercel Pro · support email.
**Engineering fixes:** hire-date import · one-click provisioning · RLS re-test.
Then do **bank export + statutory summary** in parallel or right after the first client — it's what makes payroll usable end-to-end.

> Rule of thumb: don't sign a paying client until the 🔴 list is clear. Everything 🟡 can trail the first client by a few weeks; 🟢 is roadmap.
