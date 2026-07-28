/** How an employee is paid, derived from their saved details:
 *  bank account + IFSC → NEFT; else a UPI ID → UPI; else nothing on file. */
export type PayoutSource = { bankAccount: string | null; bankIfsc: string | null; upiId: string | null };
export type PayoutMode = "NEFT" | "UPI" | "none";

export function payoutMethod(p: PayoutSource | null | undefined): { mode: PayoutMode; label: string } {
  if (p?.bankAccount && p?.bankIfsc) {
    return { mode: "NEFT", label: `Bank transfer (NEFT) · A/C ••••${p.bankAccount.slice(-4)} · ${p.bankIfsc}` };
  }
  if (p?.upiId) return { mode: "UPI", label: `UPI · ${p.upiId}` };
  return { mode: "none", label: "Not set" };
}
