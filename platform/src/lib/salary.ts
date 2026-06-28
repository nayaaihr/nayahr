// Indian CTC breakdown from an annual gross. Client-safe (pure, no server deps).
// A conventional structure: Basic 40% of CTC, HRA 50% of Basic, fixed Conveyance,
// Employer PF 12% of Basic, and Special Allowance as the balancing figure.

export type SalaryComponent = { label: string; annual: number; monthly: number; note?: string };

export const rupee = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export function salaryBreakdown(annual: number): SalaryComponent[] {
  const a = Math.max(0, annual);
  const basic = Math.round(a * 0.4);
  const hra = Math.round(basic * 0.5);
  const conveyance = Math.min(19200, Math.max(0, a - basic - hra));
  const pf = Math.round(basic * 0.12);
  const special = Math.max(0, a - basic - hra - conveyance - pf);
  return [
    { label: "Basic Pay", annual: basic, note: "40% of CTC" },
    { label: "House Rent Allowance (HRA)", annual: hra, note: "50% of Basic" },
    { label: "Conveyance Allowance", annual: conveyance, note: "₹1,600/mo" },
    { label: "Special Allowance", annual: special, note: "balancing" },
    { label: "Employer PF", annual: pf, note: "12% of Basic" },
  ].map((c) => ({ ...c, monthly: Math.round(c.annual / 12) }));
}
