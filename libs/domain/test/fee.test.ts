import { describe, expect, it } from "vitest";
import { calculateBuyFees, calculateSellFees, type FeeProfile } from "../src/index.js";

const profile: FeeProfile = {
  id: "fp-1",
  name: "default",
  commissionRateBps: 14,
  commissionDiscountBps: 10000,
  minCommissionNtd: 20,
  commissionRoundingMode: "FLOOR",
  taxRoundingMode: "FLOOR",
  stockSellTaxRateBps: 30,
  stockDayTradeTaxRateBps: 15,
  etfSellTaxRateBps: 10,
  bondEtfSellTaxRateBps: 0,
};

describe("fee calculation", () => {
  it("applies min commission", () => {
    const fee = calculateBuyFees(profile, 10_000);
    expect(fee.commissionNtd).toBe(20);
  });

  it("applies stock sell tax", () => {
    const fee = calculateSellFees(profile, {
      tradeValueNtd: 1_000_000,
      instrumentType: "STOCK",
      isDayTrade: false,
    });
    expect(fee.taxNtd).toBe(3000);
  });

  it("applies day trade sell tax", () => {
    const fee = calculateSellFees(profile, {
      tradeValueNtd: 1_000_000,
      instrumentType: "STOCK",
      isDayTrade: true,
    });
    expect(fee.taxNtd).toBe(1500);
  });
});
