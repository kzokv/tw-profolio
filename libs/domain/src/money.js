export function applyRounding(value, mode) {
    if (mode === "FLOOR")
        return Math.floor(value);
    if (mode === "CEIL")
        return Math.ceil(value);
    return Math.round(value);
}
export function bpsAmount(baseNtd, bps) {
    return (baseNtd * bps) / 10_000;
}
//# sourceMappingURL=money.js.map