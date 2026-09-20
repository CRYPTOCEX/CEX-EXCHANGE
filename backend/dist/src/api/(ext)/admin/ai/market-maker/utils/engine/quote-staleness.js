"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETIRE_AT_EDGE_FRACTION = void 0;
exports.isCrossedQuote = isCrossedQuote;
exports.isStaleQuote = isStaleQuote;
exports.quoteMargin = quoteMargin;
function isCrossedQuote(order, reference) {
    if (reference === null || reference <= BigInt(0))
        return false;
    if (!order.isRealLiquidity)
        return false;
    return order.side === "BUY"
        ? order.price >= reference
        : order.price <= reference;
}
const MARGIN_SCALE = BigInt(1000000);
function isStaleQuote(order, reference, marginFraction = 0) {
    if (reference === null || reference <= BigInt(0))
        return false;
    if (!order.isRealLiquidity)
        return false;
    if (order.price <= BigInt(0))
        return false;
    const safeMargin = Number.isFinite(marginFraction) && marginFraction > 0 ? marginFraction : 0;
    const margin = BigInt(Math.round(safeMargin * Number(MARGIN_SCALE)));
    return order.side === "BUY"
        ? reference * MARGIN_SCALE <= order.price * (MARGIN_SCALE + margin)
        : reference * MARGIN_SCALE >= order.price * (MARGIN_SCALE - margin);
}
exports.RETIRE_AT_EDGE_FRACTION = 2 / 3;
function quoteMargin(order, sweepMarginFraction) {
    const sweep = Number.isFinite(sweepMarginFraction) && sweepMarginFraction > 0
        ? sweepMarginFraction
        : 0;
    const edge = Number(order === null || order === void 0 ? void 0 : order.placementSpread);
    if (!Number.isFinite(edge) || edge <= 0)
        return sweep;
    return Math.max(sweep, edge * exports.RETIRE_AT_EDGE_FRACTION);
}
