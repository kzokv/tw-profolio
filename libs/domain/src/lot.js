export function allocateSellLots(lots, quantityToSell, method) {
    const orderedLots = [...lots].sort((a, b) => {
        if (method === "FIFO")
            return a.openedAt.localeCompare(b.openedAt);
        return b.openedAt.localeCompare(a.openedAt);
    });
    let remainingQty = quantityToSell;
    let allocatedCostNtd = 0;
    const matchedLotIds = [];
    const updates = new Map();
    for (const lot of orderedLots) {
        if (remainingQty <= 0)
            break;
        if (lot.openQuantity <= 0)
            continue;
        const matchedQty = Math.min(remainingQty, lot.openQuantity);
        const avgCostPerShare = lot.totalCostNtd / lot.openQuantity;
        allocatedCostNtd += Math.round(avgCostPerShare * matchedQty);
        remainingQty -= matchedQty;
        updates.set(lot.id, {
            ...lot,
            openQuantity: lot.openQuantity - matchedQty,
            totalCostNtd: Math.max(0, lot.totalCostNtd - Math.round(avgCostPerShare * matchedQty)),
        });
        matchedLotIds.push(lot.id);
    }
    if (remainingQty > 0) {
        throw new Error("Insufficient quantity to sell");
    }
    const updatedLots = lots.map((lot) => updates.get(lot.id) ?? lot);
    return { matchedLotIds, allocatedCostNtd, updatedLots };
}
//# sourceMappingURL=lot.js.map