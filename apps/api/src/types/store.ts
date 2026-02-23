import type { FeeProfile, InstrumentType, Lot } from "@tw-portfolio/domain";
import type { UserSettings } from "@tw-portfolio/shared-types";

export interface Account {
  id: string;
  name: string;
  userId: string;
  feeProfileId: string;
}

export interface FeeProfileBinding {
  accountId: string;
  symbol: string;
  feeProfileId: string;
}

export interface SymbolDef {
  ticker: string;
  type: InstrumentType;
}

export type TransactionType = "BUY" | "SELL";

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  instrumentType: InstrumentType;
  type: TransactionType;
  quantity: number;
  priceNtd: number;
  tradeDate: string;
  commissionNtd: number;
  taxNtd: number;
  isDayTrade: boolean;
  feeSnapshot: FeeProfile;
  realizedPnlNtd?: number;
}

export interface RecomputePreviewItem {
  transactionId: string;
  previousCommissionNtd: number;
  previousTaxNtd: number;
  nextCommissionNtd: number;
  nextTaxNtd: number;
}

export interface RecomputeJob {
  id: string;
  userId: string;
  accountId?: string;
  profileId: string;
  status: "PREVIEWED" | "CONFIRMED";
  createdAt: string;
  items: RecomputePreviewItem[];
}

export type CorporateActionType = "DIVIDEND" | "SPLIT" | "REVERSE_SPLIT";

export interface CorporateAction {
  id: string;
  accountId: string;
  symbol: string;
  actionType: CorporateActionType;
  numerator: number;
  denominator: number;
  actionDate: string;
}

export interface Store {
  userId: string;
  settings: UserSettings;
  accounts: Account[];
  feeProfileBindings: FeeProfileBinding[];
  feeProfiles: FeeProfile[];
  transactions: Transaction[];
  lots: Lot[];
  symbols: SymbolDef[];
  recomputeJobs: RecomputeJob[];
  corporateActions: CorporateAction[];
  idempotencyKeys: Set<string>;
}
