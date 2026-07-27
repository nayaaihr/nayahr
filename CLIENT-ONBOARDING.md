# NayaHR — Subscriptions & Client Onboarding Guide

_A practical runbook for taking NayaHR from "live demo" to "paying clients." Two parts:_
1. **When do the free tiers run out** — what to buy, and when.
2. **How to onboard a client** — step by step.

_Last updated: July 2026. Vendor pricing changes — re-check the linked pages before deciding._

---

## PART 1 — Subscriptions: when do you need to pay?

You're on the free tiers of **Vercel**, **Clerk**, and **Neon**. Here's the honest trigger for each, in the order you'll actually hit them.

### TL;DR — the order you'll upgrade

| # | Service | Free is fine until… | What to buy | Cost | Trigger type |
|---|---------|--------------------|-------------|------|--------------|
| 1 | **Vercel** | you have **any paying client** | **Pro** | **$20/user/mo** | Licensing (Terms of Service) |
| 2 | **Neon** | your first client with **daily real usage** | **Launch** (usage-based) | **~$5–25/mo** at small scale | Reliability + compute limit |
| 3 | **Clerk** | ~**50,000** monthly active users, OR you want to remove "Secured by Clerk" | **Pro** | **$25/mo** | Branding / scale |
| — | **Anthropic (AI)** | — (pay per use from day 1) | already pay-as-you-go | per token | Usage cost |
| — | **Email** (hello@nayahr.in) | you need a real support inbox | Zoho Mail / Google Workspace | ~₹75–150/user/mo | Professionalism |

### 1. Vercel — buy **Pro** the moment you take a paying client (first upgrade)

- The **Hobby (free) plan is non-commercial only.** Vercel's terms prohibit using it for a business. So the trigger is **legal, not technical**: the day you have a paying customer, you should be on **Pro ($20/user/mo)**.
- Pro also gives commercial-use rights, **1 TB bandwidth**, higher limits, and $20 of included usage credits.
- **One Pro plan covers both your Vercel projects** (marketing + app) — it's billed per team member, not per project.
- **Action:** upgrade to Pro before/at your first signed client.

### 2. Neon — move to **Launch** at your first real client (second upgrade)

- **Free plan:** 100 compute-hours/month, **0.5 GB storage**, scale-to-zero (the DB "sleeps" when idle).
- Two things will push you off free with real clients:
  - **Compute (100 CU-hrs/mo):** a database serving clients throughout the day burns this quickly. Once you have steady daily usage you'll exceed it.
  - **Cold starts:** on free, the sleeping DB takes ~0.5s to wake on the first request — a small but real UX hit for a live product.
- **Launch plan** is now **pure usage-based with no monthly minimum** (~$0.11/compute-hour, $0.35/GB-month). At small scale that's often **just a few dollars a month**, and you get: no cold-start pain, more compute headroom, and **longer backups / point-in-time recovery** — which you genuinely want for client **payroll** data.
- ⚠️ **Storage note specific to NayaHR:** profile photos and company logos are stored **inside** the database (as data URLs), and the `audit_log` grows forever. That eats the 0.5 GB faster than plain text would. Another reason to move off free early.
- **Action:** move to Launch before you depend on it for a real client's data (it's cheap at low usage, so err early).

### 3. Clerk — stay free a long time; **Pro** is mostly cosmetic

- **Free covers up to ~50,000 monthly active users** (raised in Feb 2026). Across many client companies that's still a long way off — e.g. 100 clients × 100 employees = 10,000, well under the cap.
- The **only near-term reason to pay $25/mo (Pro)** is to remove the small **"Secured by Clerk"** footer on the sign-in screen for a cleaner, white-labelled look — nice for enterprise-y demos, not required.
- Your custom domain **clerk.nayahr.in** works on free. (Only extra *satellite* domains cost $10/mo each — you don't need those.)
- **Action:** none required to onboard first clients. Consider Pro when you want to drop the Clerk branding.

### 4. Anthropic (the AI assistant) — a usage cost from day one

- Not a subscription — you **pay per token** each time someone uses the AI assistant. It's small per action but scales with usage.
- Keep an eye on it as clients adopt the assistant; set a monthly budget/alert in the Anthropic console.

### 5. Data residency (important for Indian clients / DPDP)

- Some Indian clients (especially larger ones) will ask **where their HR/payroll data is stored.** Neon runs on AWS regions including **Mumbai (ap-south-1)**.
- **Decide your production DB region deliberately** — moving regions later is disruptive. If Indian data residency matters to your buyers, host the production database in **Mumbai**. _(Check which region your current prod DB is in and plan accordingly before scaling.)_

### Rough monthly floor once you have paying clients
**Vercel Pro $20 + Neon Launch ~$5–15 + (optional Clerk Pro $25) + Anthropic usage + email ~₹150.** Call it **~$25–70/month** to run the whole platform for your first clients — margins stay healthy.

---

## PART 2 — How to onboard a client (step by step)

This is the operational checklist for taking a signed client from "yes" to "live and trained."

### Stage 0 — Before you touch the app (sales → kickoff)

**Collect from the client** (send them this list):

- [ ] **Legal company name** (as it should appear on payslips)
- [ ] **The Owner** — who will be the account owner (usually the founder or HR head): their **name + email**
- [ ] **HR admin(s)** who'll run the system day-to-day: names + emails
- [ ] **Employee roster** as a spreadsheet (see the exact format below)
- [ ] **Leave policy** — annual entitlements (Earned/Casual/Sick etc.)
- [ ] **Pay details** — monthly pay date, and whether they want NayaHR's default salary structure (Basic 40% / HRA / etc.)
- [ ] **Company logo** (PNG/JPG)

**Set expectations (say this out loud):**
- NayaHR **calculates** payroll and produces payslips; **disbursement (bank transfer) and statutory filing (PF/ESI/PT/TDS) are done by them** in their bank/EPFO/TRACES portals, using NayaHR's numbers. _(This is the v1 boundary.)_
- TDS shown is an **estimate** (new regime), not a declaration-based final figure.

### Stage 1 — Provision the client's workspace (create their tenant)

NayaHR is **invite-only**, so a new company is created deliberately — but it's now **one command** (`client:create`), run with the prod owner DB URL:

```bash
cd "…/NayaHR/platform" && DATABASE_URL='<PROD owner url>' npm run client:create -- \
     --name "Client Legal Name Pvt Ltd" --email owner@client.com
```

This pre-creates the tenant + a pending **Owner** and **sends the Clerk sign-up invitation** in one shot. The owner clicks the email, signs up, and NayaHR's invite-claim flow makes them the Owner of the new company. No `SIGNUP_ALLOWLIST` edit, no manual Clerk-dashboard step. (It refuses if the email is already in use.) `CLERK_SECRET_KEY` must also be set for the invite to send — otherwise the workspace is created and you invite from the Clerk dashboard.

**To remove a test or former client workspace** (deletes the tenant + all its data — dry-run first):

```bash
cd "…/NayaHR/platform" && DATABASE_URL='<PROD owner url>' npm run db:cleanup -- --tenant <tenant-uuid>            # dry run
cd "…/NayaHR/platform" && DATABASE_URL='<PROD owner url>' npm run db:cleanup -- --tenant <tenant-uuid> --delete  # delete it
```

_(Running `npm run db:cleanup` with no `--tenant` sweeps only empty/orphan tenants — it never touches a tenant that has employees.)_

> 🔧 **Future:** an in-app super-admin console could wrap these commands in buttons — nice-to-have, not required.

### Stage 2 — Owner sets up the company

Have the Owner (or do it with them on a screen-share):

1. **Rename the company:** sidebar → **Administrators → Company** → enter the legal name → Save. _(Fixes the default "My Company".)_
2. **Upload the logo:** sidebar company brand → **+ Logo**.
3. **Import the roster:** **People → Import** and upload the CSV (format below). This creates every employee with a dated Hire, their salary, and auto-creates departments/locations.
4. **Set managers:** open each employee (or the key ones) → edit job → set their **Manager**. _(The importer doesn't set reporting lines.)_
5. **Add HR admins:** **Administrators → Grant admin access** → pick the client's HR person(s) so they can run things too. _(They must be invited employees first — see Stage 3.)_

#### The exact roster CSV format

First row is the header. **Only `name` is required.** One employee per row.

```
name,title,department,location,salary,hire date,email
Rohan Mehta,Head of Engineering,Engineering,Bengaluru,3600000,10/02/21,rohan.mehta@acme.com
Priya Nair,Product Designer,Design,Bengaluru,1650000,05/07/22,priya.nair@acme.com
```

- **salary** = annual CTC as a plain number (no ₹, no commas): `1200000`.
- **hire date** = `DD/MM/YY` or `DD/MM/YYYY` (also ISO `YYYY-MM-DD`; `/`, `-` or `.` separators all work).
- Accepted header aliases: `title`↔`designation`/`role`, `department`↔`dept`, `location`↔`city`, `salary`↔`ctc`/`annual salary`, `hire date`↔`doj`/`date of joining`, `email`↔`email id`.
- ⚠️ **No commas inside any value** (the importer does a simple comma split) — e.g. write `Bengaluru`, not `Bengaluru, KA`.

> ✅ **Hire dates import correctly** (fixed Jul 2026 — NH-101). Empty or unrecognisable dates fall back to *today*, so eyeball any unusual formats after importing.

### Stage 3 — Configure HR settings

1. **Leave:** the Indian leave types are built in (Earned, Casual, Sick, Maternity, Paternity, Bereavement, Marriage, Comp-off, Loss of Pay). Confirm the entitlements match the client's policy.
2. **Departments / locations:** created automatically from the roster — check they're clean (no duplicates from typos).
3. **Salary structure:** NayaHR splits CTC into Basic/HRA/Conveyance/Special automatically. Confirm the client is OK with the default split.

### Stage 4 — Roll out to employees

1. **Invite employees:** **People → Invite** on each person (or the batch you want live). Each gets a **Clerk invitation email** and, on sign-up, lands in **self-service** (their profile, payslips, leave, goals).
   - If someone loses the email, use **Resend** next to their "Invited" status.
2. **Tell employees what to expect:** a short note from the client's HR — "You'll get an invite from NayaHR; sign in with your work email to see your payslips and apply for leave."

### Stage 5 — First payroll (the proof moment)

1. Check every active employee has a **salary** and correct **Active** status.
2. **Payroll → Run payroll** → pick the month → **Generate draft**.
3. **Review** the per-employee table (Gross, PF, ESI, PT, TDS, Net).
4. **Finalize** — this locks the payslips and makes them visible to employees.
5. **The client then** transfers net pay via their bank and remits PF/ESI/PT/TDS by the due dates, using the run's totals.

### Stage 6 — Train the client's HR admin

Walk their HR person through (use the **NayaHR-Overview** deck as a backdrop):

- **People** — add/edit employees, effective-dated changes, the Inbox for approvals
- **Recruitment** — requisitions → candidates → make offer (salary) → hire into Core HR
- **Time off** — approving leave, balances, Loss of Pay
- **Payroll** — the run → finalize → payslips
- **Performance** — goals & review cycle
- **Compensation** — salary changes with approval + history
- **AI assistant** — "ask it to do things" (and that it respects their role)
- **Administrators** — managing HR admins, transferring ownership, renaming company

Leave them with: the **Overview PDF**, your **support contact**, and the note that **finalized payroll is locked** (review before finalizing).

### Stage 7 — Go-live & support

- [ ] Confirm the Owner + HR can log in and see the right data
- [ ] Confirm a test employee can see their payslip after finalize
- [ ] Share a **support channel** (email/WhatsApp) and response expectations
- [ ] Diarise a **check-in** after their first real payroll run

---

## Onboarding checklist (one-glance)

```
[ ] Collected: company name, owner email, HR emails, roster CSV, leave policy, logo
[ ] Vercel Pro active (if this is a paying client)
[ ] Neon on Launch (before real data)
[ ] Ran `npm run client:create` → owner invited → signed up → workspace created
[ ] Company renamed + logo uploaded
[ ] Roster imported + departments/locations verified
[ ] Managers set + HR admins granted
[ ] Leave entitlements confirmed
[ ] Employees invited
[ ] First payroll run + finalized + payslip verified
[ ] HR admin trained + Overview deck shared
[ ] Support channel shared + check-in booked
```

---

## Gaps to close before onboarding at scale (engineering to-do)

Done since first draft:
- ✅ **One-click client provisioning** — `npm run client:create` (NH-102).
- ✅ **Roster hire-date import fixed** — parses `DD/MM/YY` and friends (NH-101).

Still worth building so onboarding scales:

1. **Bank export + statutory summary** — the payday deliverables (NEFT/CSV of net pay; PF/ESI/PT/TDS totals sheet).
2. **CSV robustness** — support quoted fields so values can contain commas, plus a preview/validate step.
3. **Real support email** — `hello@nayahr.in` inbox (Zoho Mail free tier — see LAUNCH-CHECKLIST).
4. **Data-residency decision** — confirm/host the prod DB in the Mumbai region for Indian clients.

---

## Sources (pricing, as of July 2026)
- Vercel: <https://vercel.com/pricing>
- Clerk: <https://clerk.com/pricing>
- Neon: <https://neon.com/pricing>
