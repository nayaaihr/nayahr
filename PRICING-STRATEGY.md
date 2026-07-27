# NayaHR — Pricing Strategy & Market Comparison

_How to price NayaHR for Indian SMB clients, what the market charges, and how to quote a client with healthy margins._

_Prices in ₹, per employee per month (PEPM), **excluding 18% GST** unless noted. Last updated: July 2026 — re-check competitor pages before quoting._

---

## 1. The market — what comparable HRIS charge (India, 2026)

| Product | Segment | Price (PEPM) | Payroll | Setup / implementation | Notes |
|---|---|---|---|---|---|
| **greytHR** | SMB | ~₹30–70 (Pro ~₹149 @100) + base fee | Included/strong | Low / self-serve | Cheapest for small teams; payroll-first |
| **Zoho People** | SMB–Mid | ₹50 → ₹100 → ₹165 → ₹230 | **Add-on ₹33/emp** | Low / self-serve | HR only; free for 5 employees; payroll is extra |
| **Zoho Payroll** | SMB | ₹33/emp (or ₹1,000/mo for 25) | — | Low | Statutory compliance add-on |
| **Keka** | SMB–Mid | ₹83–₹180 | Included | **₹25k–₹1L** + 2% setter, quarterly min | Popular mid-market; pricier once fees stack |
| **Darwinbox** | Enterprise | ~₹350 (≈$5 @100, $3 @1,000) | Included | **$5k–$50k, 4–9 months** | Custom; min ~500 employees; not an SMB option |

**What this tells us (the strategy anchors):**
- The **SMB sweet spot is ₹50–₹150 PEPM.** greytHR/Zoho anchor the low end; Keka the middle; Darwinbox is a different (enterprise) league.
- **"All-in" is rare and valuable.** Zoho charges payroll separately; Keka/Darwinbox pile on **implementation fees**. NayaHR bundling *everything* (Core HR + Payroll + Recruitment + Performance + Time off + AI) with **no setup fee** is a genuine differentiator.
- **AI-native is unique** at this price point — none of the SMB incumbents lead with an assistant that *does the work*.
- Everyone adds **18% GST**; most enterprise tools hide **implementation + support** costs. Simplicity is a selling point.

**NayaHR's lane:** win **Indian SMBs (10–200 employees)** against greytHR / Zoho / Keka — *not* Darwinbox. Compete on **all-in value + AI + zero setup friction**, priced competitively, not cheapest.

---

## 2. NayaHR pricing model (recommended)

**One simple model: per-employee-per-month, everything included, no setup fee.**

| Plan | Employees | Price (PEPM) | Monthly minimum | Positioning |
|---|---|---|---|---|
| **Starter** | 1 – 25 | **₹79** | **₹1,499/mo** | Small teams getting organized |
| **Growth** | 26 – 50 | **₹69** | — | Scaling SMBs |
| **Business** | 51 – 100 | **₹59** | — | Established SMBs |
| **Scale** | 101 – 200 | **₹49** | — | Larger SMBs |
| **Enterprise** | 201+ | **Custom (~₹39)** | Custom | Volume deals |

- **Everything is included** at every tier — no module add-ons, no payroll surcharge.
- **Monthly minimum (₹1,499)** on Starter keeps very small clients worth serving (a 12-person shop still pays ₹1,499, not ₹948).
- **+ 18% GST** on all prices.
- **No implementation/setup fee** — a headline advantage vs Keka (₹25k–1L) and Darwinbox ($5k+).

**Why these numbers:** all-inclusive at ₹49–79 undercuts **Zoho People Pro (₹100) + Payroll (₹33) = ₹133** and **Keka (₹83–100)**, sits near **greytHR**, and beats everyone on "one price, everything in, AI included, live in days."

---

## 3. Margins — why this is highly profitable

**NayaHR's cost to serve a client is very low** because infrastructure is shared and mostly fixed:

- **Fixed platform cost (total, all clients): ~₹4,000–5,000/month** — Vercel Pro (~₹1,700) + Neon (~₹1,000–2,000) + email + misc. _This does not grow per client;_ it's covered by your **first ~3 clients.**
- **Variable cost per client: ~₹5–10 per employee/month** — Anthropic AI usage + payment-gateway fees (~2%) + a shrinking share of infra as you scale.
- **Clerk is free** to ~50,000 users, so auth adds nothing for a long time.

**Result:**
- **Contribution margin per client: ~80–92%** (revenue minus direct variable cost).
- Past the first ~3 clients (who cover the fixed nut), **~85% of every new client's revenue is margin.**
- ⚠️ Your **real cost is people time** — onboarding and support — not servers. Price and staff so one person can support many clients; that's what protects *net* margin.

---

## 4. Example quotes (what to put in front of a client)

_Assumes variable cost ≈ ₹8/employee/mo (AI + gateway + infra-at-scale). "Contribution" = monthly revenue − variable cost, before the shared fixed platform cost and your time._

| Client | Plan | PEPM | Employees | **Monthly (ex-GST)** | **Annual** | Variable cost | Contribution | Margin |
|---|---|---|---|---|---|---|---|---|
| Boutique firm | Starter | ₹79 | 15 | **₹1,499** _(floor)_ | ₹17,988 | ₹120 | ₹1,379 | **92%** |
| Growing SMB | Growth | ₹69 | 40 | **₹2,760** | ₹33,120 | ₹320 | ₹2,440 | **88%** |
| Established | Business | ₹59 | 80 | **₹4,720** | ₹56,640 | ₹640 | ₹4,080 | **86%** |
| Larger SMB | Scale | ₹49 | 150 | **₹7,350** | ₹88,200 | ₹1,200 | ₹6,150 | **84%** |
| Volume | Enterprise | ₹39 | 300 | **₹11,700** | ₹1,40,400 | ₹2,400 | ₹9,300 | **79%** |

_(Add 18% GST to the client-facing figure: e.g. the 80-employee client pays ₹4,720 + ₹850 GST = **₹5,570/mo**.)_

---

## 5. How to quote a client (quick formula)

```
1.  Pick the tier for their employee count.
2.  Monthly price = max( employees × tier PEPM , tier minimum )
3.  Add 18% GST  →  that's the client-facing monthly number.
4.  Annual price = monthly × 12, then apply the annual discount (below).
```

**Example:** 60 employees → Business tier (₹59). 60 × ₹59 = **₹3,540/mo** + GST ₹637 = **₹4,177/mo**, or **₹42,480/yr** (before annual discount).

---

## 6. Discounts & levers (use deliberately, protect the floor)

- **Annual prepay → "2 months free"** (≈17% off). Improves cash flow and retention; make it the default recommendation.
- **Founding-customer discount:** 30–40% off for your **first 5–10 logos**, locked for 12–24 months, in exchange for a testimonial/case study and a reference call. Early logos > early margin.
- **Volume:** the tier PEPM already steps down; for 200+, quote custom (~₹35–39) but **don't go below ~₹35 PEPM or ₹1,000/mo** — below that, support time isn't worth it. That's your **walk-away floor.**
- **What NOT to discount:** the setup fee (there isn't one — that's the pitch). Don't invent one to "give it away."

---

## 7. Positioning cheat-sheet (say this in the room)

- **vs Zoho:** "One price, payroll included — no add-ons to bolt on."
- **vs Keka / Darwinbox:** "No ₹25k–₹1L implementation fee and no 4–9 month rollout — you're live in **days**."
- **vs everyone:** "AI-native — an assistant that actually runs tasks, not a chatbot."
- **Anchor high, land right:** show the all-in value first (what they'd pay for Zoho People + Payroll + an ATS + a performance tool separately), then your single number looks like a steal.

---

## Sources (pricing, July 2026)
- Zoho People / Payroll: <https://www.zoho.com/in/people/pricing.html> · <https://www.zoho.com/in/payroll/pricing/>
- Keka: <https://www.keka.com/pricing>
- greytHR: <https://www.greythr.com/pricing/>
- Darwinbox: (custom / analyst estimates, ~₹350 PEPM)
