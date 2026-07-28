import { describe, it, expect } from "vitest";
import { computePay, estimateAnnualTaxNewRegime, daysInPeriod, periodLabel, ESI_WAGE_CEILING, PT_MONTHLY } from "./payroll";
import { salaryBreakdown } from "./salary";

describe("salaryBreakdown (₹12L CTC)", () => {
  it("splits into Basic 40% / HRA 50% of basic / capped conveyance / balancing special", () => {
    const b = salaryBreakdown(1_200_000);
    const annual = (p: string) => b.find((c) => c.label.startsWith(p))!.annual;
    expect(annual("Basic")).toBe(480_000);
    expect(annual("House Rent")).toBe(240_000);
    expect(annual("Conveyance")).toBe(19_200);
    expect(annual("Employer PF")).toBe(57_600);
    expect(annual("Special")).toBe(403_200);
  });
});

describe("estimateAnnualTaxNewRegime", () => {
  it("is nil when taxable income is within the §87A rebate", () => {
    expect(estimateAnnualTaxNewRegime(0)).toBe(0);
    expect(estimateAnnualTaxNewRegime(1_200_000)).toBe(0); // taxable 11.25L ≤ 12L
  });
  it("computes slab tax + 4% cess above the rebate", () => {
    // gross 15.75L → taxable 15L → 20k+40k+45k = 105k, ×1.04 = 109200
    expect(estimateAnnualTaxNewRegime(1_575_000)).toBe(109_200);
  });
});

describe("computePay — full month (₹12L, 30-day month)", () => {
  const p = computePay(1_200_000, 0, 30);
  it("earns the full gross with no proration", () => {
    expect(p.gross).toBe(95_200);
    expect(p.paidDays).toBe(30);
    expect(p.monthDays).toBe(30);
  });
  it("deducts PF (12% of basic) + flat PT, no ESI above the ceiling, no TDS in rebate", () => {
    expect(p.pfEmployee).toBe(4_800);
    expect(p.pt).toBe(PT_MONTHLY);
    expect(p.esiEmployee).toBe(0);
    expect(p.tds).toBe(0);
    expect(p.net).toBe(95_200 - 4_800 - 200); // ₹90,200
  });
  it("net = gross − total deductions", () => {
    expect(p.net).toBe(p.gross - p.totalDeductions);
  });
});

describe("computePay — hire-date proration (15 of 30 days)", () => {
  const p = computePay(1_200_000, 0, 30, 15);
  it("halves earnings and PF, tracks paid days", () => {
    expect(p.gross).toBe(47_600);
    expect(p.basic).toBe(20_000);
    expect(p.pfEmployee).toBe(2_400);
    expect(p.paidDays).toBe(15);
    expect(p.net).toBe(p.gross - p.totalDeductions);
  });
  it("pays nothing when employed for zero days", () => {
    const z = computePay(1_200_000, 0, 30, 0);
    expect(z.gross).toBe(0);
    expect(z.net).toBe(0);
    expect(z.paidDays).toBe(0);
  });
});

describe("computePay — loss of pay", () => {
  it("docks per-day gross for each unpaid day", () => {
    const p = computePay(1_200_000, 3, 30);
    expect(p.lopDays).toBe(3);
    expect(p.lop).toBe(Math.round((95_200 / 30) * 3)); // ₹9,520
    expect(p.net).toBe(p.gross - p.totalDeductions);
  });
});

describe("computePay — ESI eligibility", () => {
  it("applies ESI when gross is within the ₹21,000 ceiling", () => {
    const p = computePay(240_000, 0, 30); // gross ₹19,040/mo ≤ ceiling
    expect(p.gross).toBeLessThanOrEqual(ESI_WAGE_CEILING);
    expect(p.esiEmployee).toBe(143);   // 0.75%
    expect(p.employerEsi).toBe(619);   // 3.25%
  });
  it("no ESI above the ceiling", () => {
    expect(computePay(1_200_000, 0, 30).esiEmployee).toBe(0);
  });
});

describe("date helpers", () => {
  it("daysInPeriod handles month lengths + leap years", () => {
    expect(daysInPeriod("2026-02")).toBe(28);
    expect(daysInPeriod("2024-02")).toBe(29);
    expect(daysInPeriod("2026-04")).toBe(30);
    expect(daysInPeriod("2026-07")).toBe(31);
  });
  it("periodLabel formats a YYYY-MM", () => {
    expect(periodLabel("2026-07")).toBe("July 2026");
  });
});
