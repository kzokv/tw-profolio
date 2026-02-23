import type { CostBasisMethod, Lot, SellAllocationResult } from "./types.js";
export declare function allocateSellLots(lots: Lot[], quantityToSell: number, method: CostBasisMethod): SellAllocationResult;
