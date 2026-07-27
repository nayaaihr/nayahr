// Indian monthly payroll computation. Pure + client-safe (no server deps) so the
// same math backs the payslip UI and the payroll run. Builds on salaryBreakdown.
//
// v1 rules (confirmed with HR):
//   • Employee PF = 12% of Basic (no wage ceiling)
//   • ESI = employee 0.75% / employer 3.25% of gross, only if gross ≤ ₹21,000/mo
//   • Professional Tax = ₹200/mo flat (single slab; state-configurable later)
//   • TDS = estimated new-regime income tax (annual projection ÷ 12)
//   • Loss of Pay = per-day gross × approved unpaid ("Loss of Pay") leave days
import { salaryBreakdown } from "./salary";

export const ESI_WAGE_CEILING = 21000; // monthly gross
export const PT_MONTHLY = 200;         // flat professional tax

// New-regime slabs, FY 2025-26 onward — [upper bound, marginal rate].
const NEW_REGIME_SLABS: Array<[number, number]> = [
  [400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15],
  [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30],
];
const STD_DEDUCTION = 75000;      // new-regime standard deduction
const REBATE_87A_LIMIT = 1200000; // taxable income ≤ this → tax nil (87A)
const CESS = 0.04;                // health & education cess

/** Estimated annual income tax under the new regime (standard deduction + 87A
 *  rebate + 4% cess). An estimate — ignores 80C/HRA exemption/declarations. */
export function estimateAnnualTaxNewRegime(annualGross: number): number {
  const taxable = Math.max(0, annualGross - STD_DEDUCTION);
  if (taxable <= REBATE_87A_LIMIT) return 0;
  let tax = 0, lower = 0;
  for (const [upper, rate] of NEW_REGIME_SLABS) {
    if (taxable > lower) { tax += (Math.min(taxable, upper) - lower) * rate; lower = upper; }
    else break;
  }
  return Math.round(tax * (1 + CESS));
}

export type PayComponents = {
  basic: number; hra: number; conveyance: number; special: number;
  gross: number;                        // monthly employee earnings (excludes employer PF)
  lopDays: number; lop: number;         // loss of pay
  pfEmployee: number; esiEmployee: number; pt: number; tds: number;
  employerPf: number; employerEsi: number;
  totalDeductions: number; net: number; // net = gross − all deductions (incl. LOP)
};

const round = (n: number) => Math.round(n);

/** One month's payslip from annual CTC + unpaid (LOP) days in the period. */
export function computePay(annualCTC: number, unpaidDays: number, daysInMonth: number): PayComponents {
  const b = salaryBreakdown(annualCTC);
  const m = (prefix: string) => b.find((c) => c.label.startsWith(prefix))?.monthly ?? 0;
  const basic = m("Basic");
  const hra = m("House Rent");
  const conveyance = m("Conveyance");
  const special = m("Special");
  const gross = basic + hra + conveyance + special;

  const perDay = daysInMonth > 0 ? gross / daysInMonth : 0;
  const lopDays = Math.max(0, unpaidDays);
  const lop = round(perDay * lopDays);

  const pfEmployee = round(basic * 0.12);
  const esiEmployee = gross <= ESI_WAGE_CEILING ? round(gross * 0.0075) : 0;
  const pt = gross > 0 ? PT_MONTHLY : 0;
  const tds = round(estimateAnnualTaxNewRegime(gross * 12) / 12);

  const employerPf = round(basic * 0.12);
  const employerEsi = gross <= ESI_WAGE_CEILING ? round(gross * 0.0325) : 0;

  const totalDeductions = lop + pfEmployee + esiEmployee + pt + tds;
  const net = Math.max(0, gross - totalDeductions);
  return { basic, hra, conveyance, special, gross, lopDays, lop, pfEmployee, esiEmployee, pt, tds, employerPf, employerEsi, totalDeductions, net };
}

/** Days in the pay month for a "YYYY-MM" period string. */
export function daysInPeriod(period: string): number {
  const [y, mo] = period.split("-").map(Number);
  return new Date(y, mo, 0).getDate();
}

/** "2026-07" → "July 2026" for display. */
export function periodLabel(period: string): string {
  const [y, mo] = period.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
