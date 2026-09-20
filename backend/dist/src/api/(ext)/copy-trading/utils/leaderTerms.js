"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateProfitShareChange = evaluateProfitShareChange;
function toRate(value) {
    const n = typeof value === "number" ? value : Number(value !== null && value !== void 0 ? value : NaN);
    return Number.isFinite(n) ? n : NaN;
}
function evaluateProfitShareChange(input) {
    const current = toRate(input.current);
    const next = toRate(input.next);
    if (Number.isNaN(next))
        return { allowed: true };
    if (Number.isNaN(current))
        return { allowed: true };
    if (next <= current)
        return { allowed: true };
    if (input.openPositionCount > 0) {
        return {
            allowed: false,
            reason: `You cannot raise your profit share from ${current}% to ${next}% while ` +
                `${input.openPositionCount} copied position(s) are still open. Those gains were ` +
                `earned under the rate your followers agreed to. Lower it now if you wish, or ` +
                `raise it once the open positions have closed.`,
        };
    }
    return { allowed: true };
}
