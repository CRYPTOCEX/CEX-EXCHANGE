"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realisedQuoteBudgetDelta = realisedQuoteBudgetDelta;
exports.floatColumnGranularity = floatColumnGranularity;
exports.nextQuoteBudgetClaim = nextQuoteBudgetClaim;
function toFinite(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    const text = String(value).trim();
    if (text === "")
        return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
}
function realisedQuoteBudgetDelta(input) {
    var _a, _b;
    const profit = toFinite(input.profit);
    if (profit === null)
        return 0;
    if (profit <= 0) {
        return profit;
    }
    const leaderShare = Math.max(0, (_a = toFinite(input.leaderShare)) !== null && _a !== void 0 ? _a : 0);
    const platformFee = Math.max(0, (_b = toFinite(input.platformFee)) !== null && _b !== void 0 ? _b : 0);
    const net = profit - leaderShare - platformFee;
    return net > 0 ? net : 0;
}
const FLOAT_SIGNIFICANT_DIGITS = 6;
function floatColumnGranularity(magnitude) {
    const m = Math.abs(Number(magnitude));
    if (!Number.isFinite(m) || m === 0)
        return 0;
    let digits = Math.floor(Math.log10(m)) + 1;
    while (Math.pow(10, digits) <= m)
        digits++;
    while (digits > 1 && Math.pow(10, digits - 1) > m)
        digits--;
    return Math.pow(10, digits - FLOAT_SIGNIFICANT_DIGITS);
}
function nextQuoteBudgetClaim(current, delta) {
    const base = toFinite(current);
    if (base === null)
        return null;
    if (!Number.isFinite(delta) || delta === 0)
        return null;
    const target = base + delta;
    if (!(target > 0))
        return 0;
    const grid = floatColumnGranularity(target);
    if (!(grid > 0))
        return target;
    const floored = Math.floor(target / grid) * grid;
    if (!Number.isFinite(floored) || floored > target) {
        return Math.max(0, target - grid);
    }
    return Math.max(0, floored);
}
