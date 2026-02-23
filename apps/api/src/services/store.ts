import type { FeeProfile } from "@tw-portfolio/domain";
import type { Store } from "../types/store.js";

const defaultFeeProfile: FeeProfile = {
  id: "fp-default",
  name: "Default Broker",
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

export function createStore(): Store {
  return {
    userId: "user-1",
    settings: {
      userId: "user-1",
      locale: "en",
      costBasisMethod: "FIFO",
      quotePollIntervalSeconds: 10,
    },
    accounts: [
      {
        id: "acc-1",
        name: "Main",
        userId: "user-1",
        feeProfileId: defaultFeeProfile.id,
      },
    ],
    feeProfiles: [defaultFeeProfile],
    feeProfileBindings: [],
    transactions: [],
    lots: [],
    symbols: [
      { ticker: "2330", type: "STOCK" },
      { ticker: "0050", type: "ETF" },
      { ticker: "00679B", type: "BOND_ETF" },
    ],
    recomputeJobs: [],
    corporateActions: [],
    idempotencyKeys: new Set<string>(),
  };
}
