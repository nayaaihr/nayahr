import { describe, it, expect } from "vitest";
import { payoutMethod } from "./payout";

describe("payoutMethod", () => {
  it("prefers NEFT when a bank account + IFSC are present, masking the account", () => {
    const r = payoutMethod({ bankAccount: "123456789012", bankIfsc: "HDFC0001234", upiId: null });
    expect(r.mode).toBe("NEFT");
    expect(r.label).toContain("••••9012");
    expect(r.label).toContain("HDFC0001234");
  });
  it("falls back to UPI when bank details are absent", () => {
    const r = payoutMethod({ bankAccount: null, bankIfsc: null, upiId: "name@okhdfcbank" });
    expect(r.mode).toBe("UPI");
    expect(r.label).toBe("UPI · name@okhdfcbank");
  });
  it("needs BOTH account and IFSC for NEFT — an incomplete bank pair uses UPI", () => {
    expect(payoutMethod({ bankAccount: "123456789012", bankIfsc: null, upiId: "a@b" }).mode).toBe("UPI");
  });
  it("reports 'none' when nothing is on file", () => {
    expect(payoutMethod({ bankAccount: null, bankIfsc: null, upiId: null }).mode).toBe("none");
    expect(payoutMethod(null).mode).toBe("none");
  });
});
