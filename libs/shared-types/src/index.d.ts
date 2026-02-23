export type CostBasisMethod = "FIFO" | "LIFO";
export type LocaleCode = "en" | "zh-TW";
export type InstrumentType = "STOCK" | "ETF" | "BOND_ETF";
export interface UserSettings {
    userId: string;
    locale: LocaleCode;
    costBasisMethod: CostBasisMethod;
    quotePollIntervalSeconds: number;
}
export interface FeeProfileDto {
    id: string;
    accountId: string;
    name: string;
    commissionRateBps: number;
    commissionDiscountBps: number;
    minCommissionNtd: number;
    commissionRoundingMode: "FLOOR" | "ROUND" | "CEIL";
    taxRoundingMode: "FLOOR" | "ROUND" | "CEIL";
    stockSellTaxRateBps: number;
    stockDayTradeTaxRateBps: number;
    etfSellTaxRateBps: number;
    bondEtfSellTaxRateBps: number;
}
