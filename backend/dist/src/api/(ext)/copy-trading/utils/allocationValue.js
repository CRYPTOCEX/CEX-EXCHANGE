"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocationCurrencyLegs = allocationCurrencyLegs;
function toAmount(value) {
    const n = typeof value === "number" ? value : Number(value !== null && value !== void 0 ? value : 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function allocationCurrencyLegs(allocations) {
    var _a;
    const legs = [];
    if (!Array.isArray(allocations))
        return legs;
    for (const alloc of allocations) {
        const parts = String((_a = alloc === null || alloc === void 0 ? void 0 : alloc.symbol) !== null && _a !== void 0 ? _a : "").split("/");
        if (parts.length !== 2 || !parts[0] || !parts[1])
            continue;
        const [baseCurrency, quoteCurrency] = parts;
        const base = toAmount(alloc.baseAmount);
        if (base > 0)
            legs.push({ amount: base, currency: baseCurrency });
        const quote = toAmount(alloc.quoteAmount);
        if (quote > 0)
            legs.push({ amount: quote, currency: quoteCurrency });
    }
    return legs;
}
