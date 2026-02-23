import type { FeeProfile, InstrumentType } from "./types.js";
export interface TradeFeeInput {
    tradeValueNtd: number;
    instrumentType: InstrumentType;
    isDayTrade: boolean;
}
export interface TradeFeeResult {
    commissionNtd: number;
    taxNtd: number;
}
export declare function calculateBuyFees(profile: FeeProfile, tradeValueNtd: number): TradeFeeResult;
export declare function calculateSellFees(profile: FeeProfile, input: TradeFeeInput): TradeFeeResult;
