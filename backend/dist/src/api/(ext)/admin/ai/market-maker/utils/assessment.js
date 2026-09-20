"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BAND_SOFT_EDGE = exports.MIN_ACTIVE_BOTS = void 0;
exports.classifyBand = classifyBand;
exports.assessMarketMaker = assessMarketMaker;
exports.severityRank = severityRank;
exports.MIN_ACTIVE_BOTS = 2;
exports.BAND_SOFT_EDGE = 0.8;
function classifyBand(price, low, high) {
    if (!(price > 0) || !(low > 0) || !(high > 0) || !(high > low)) {
        return { band: "unknown", position: null };
    }
    const logLow = Math.log(low);
    const logHigh = Math.log(high);
    const halfWidth = (logHigh - logLow) / 2;
    if (!(halfWidth > 0) || !isFinite(halfWidth)) {
        return { band: "unknown", position: null };
    }
    const centre = (logHigh + logLow) / 2;
    const position = (Math.log(price) - centre) / halfWidth;
    const magnitude = Math.abs(position);
    const band = magnitude > 1 ? "out" : magnitude > exports.BAND_SOFT_EDGE ? "edge" : "in";
    return { band, position };
}
function assessMarketMaker(input) {
    var _a;
    const lastKnownPrice = Number(input.lastKnownPrice) || 0;
    const targetPrice = Number(input.targetPrice) || 0;
    const priceRangeLow = Number(input.priceRangeLow) || 0;
    const priceRangeHigh = Number(input.priceRangeHigh) || 0;
    const maxDailyVolume = Number(input.maxDailyVolume) || 0;
    const currentDailyVolume = Number(input.currentDailyVolume) || 0;
    const realLiquidityPercent = Number(input.realLiquidityPercent) || 0;
    const totalValueLocked = Number((_a = input.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) || 0;
    const blockers = [];
    if (input.activeBots < exports.MIN_ACTIVE_BOTS)
        blockers.push("bots");
    if (realLiquidityPercent > 0 && !(totalValueLocked > 0))
        blockers.push("pool");
    if (maxDailyVolume > 0 && currentDailyVolume >= maxDailyVolume) {
        blockers.push("budget");
    }
    const { band, position } = classifyBand(lastKnownPrice, priceRangeLow, priceRangeHigh);
    let inventory = null;
    const markPrice = lastKnownPrice > 0 ? lastKnownPrice : targetPrice;
    if (input.pool && markPrice > 0) {
        const baseValue = (Number(input.pool.baseCurrencyBalance) || 0) * markPrice;
        const quoteValue = Number(input.pool.quoteCurrencyBalance) || 0;
        const fundedBaseValue = (Number(input.pool.initialBaseBalance) || 0) * markPrice;
        const fundedQuoteValue = Number(input.pool.initialQuoteBalance) || 0;
        const held = baseValue + quoteValue;
        const funded = fundedBaseValue + fundedQuoteValue;
        if (held > 0 && funded > 0) {
            const baseShare = (baseValue / held) * 100;
            const fundedBaseShare = (fundedBaseValue / funded) * 100;
            inventory = {
                baseShare,
                fundedBaseShare,
                skew: baseShare - fundedBaseShare,
            };
        }
    }
    return {
        band,
        bandPosition: position,
        targetPosition: classifyBand(targetPrice, priceRangeLow, priceRangeHigh)
            .position,
        quoting: input.status === "ACTIVE" && blockers.length === 0,
        blockers,
        inventory,
    };
}
function severityRank(status, quoting, band) {
    if (status !== "ACTIVE")
        return status === "PAUSED" ? 5 : 6;
    if (!quoting)
        return 0;
    if (band === "out")
        return 1;
    if (band === "edge")
        return 2;
    if (band === "unknown")
        return 3;
    return 4;
}
