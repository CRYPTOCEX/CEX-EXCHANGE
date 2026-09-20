"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.effectiveTetherStrength = effectiveTetherStrength;
exports.tetherHalfLifeHours = tetherHalfLifeHours;
exports.assessTetherViability = assessTetherViability;
const follow_band_1 = require("./follow-band");
const TETHERED_MODES = new Set(["FOLLOW_EXTERNAL", "HYBRID"]);
const FOLLOW_TAU_AT_FULL_STRENGTH_SECONDS = 86400;
const HYBRID_STRENGTH_FACTOR = 0.5;
const SETTLED_FRACTION = 0.5;
function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}
function effectiveTetherStrength(priceMode, correlationStrength) {
    if (!TETHERED_MODES.has(String(priceMode)))
        return 0;
    const raw = toNumber(correlationStrength);
    if (!Number.isFinite(raw))
        return 0;
    const base = Math.max(0, Math.min(100, raw)) / 100;
    return priceMode === "HYBRID" ? base * HYBRID_STRENGTH_FACTOR : base;
}
function tetherHalfLifeHours(strength) {
    if (!(strength > 0))
        return null;
    const tauSeconds = FOLLOW_TAU_AT_FULL_STRENGTH_SECONDS / strength;
    return (Math.LN2 * tauSeconds) / 3600;
}
function assessTetherViability(input) {
    const idle = {
        verdict: "NOT_TETHERED",
        following: false,
        trackingErrorPercent: null,
        band: null,
        halfLifeHours: null,
        message: null,
    };
    if (!TETHERED_MODES.has(String(input.priceMode)))
        return idle;
    const strength = effectiveTetherStrength(input.priceMode, input.correlationStrength);
    const halfLifeHours = tetherHalfLifeHours(strength);
    const symbol = input.externalSymbol || "the reference symbol";
    if (!(strength > 0)) {
        return {
            ...idle,
            verdict: "NO_REFERENCE",
            message: `Correlation strength is 0, so this market is not being pulled toward ${symbol} ` +
                `at all. Raise it to make the tether do anything.`,
        };
    }
    const reference = toNumber(input.externalPrice);
    if (!(reference > 0)) {
        return {
            ...idle,
            verdict: "NO_REFERENCE",
            halfLifeHours,
            message: `No price is coming back for ${symbol}, so this market is not tracking anything. ` +
                `Check that an exchange provider is enabled and credentialled, and that the ` +
                `symbol exists on it.`,
        };
    }
    const band = (0, follow_band_1.resolveFollowBand)({
        priceMode: input.priceMode,
        externalPrice: reference,
        targetPrice: input.targetPrice,
        priceRangeLow: input.priceRangeLow,
        priceRangeHigh: input.priceRangeHigh,
    });
    if (band.referenceRejected) {
        return {
            verdict: "REFERENCE_REJECTED",
            following: false,
            trackingErrorPercent: null,
            band: null,
            halfLifeHours,
            message: `${symbol} is reporting ${reference}, which is too far from this market's target ` +
                `of ${toNumber(input.targetPrice)} to be the same asset. The tether is switched ` +
                `off and the configured price range is holding, so nothing has been dislocated — ` +
                `check that the external symbol names the pair you meant.`,
        };
    }
    const priceInput = input.lastKnownPrice === undefined || input.lastKnownPrice === null
        ? input.targetPrice
        : input.lastKnownPrice;
    const price = toNumber(priceInput);
    const bandOut = band.priceRangeLow > 0 && band.priceRangeHigh > band.priceRangeLow
        ? { low: band.priceRangeLow, high: band.priceRangeHigh }
        : null;
    const error = (0, follow_band_1.trackingError)(price, reference);
    if (error === null) {
        return {
            verdict: "CONVERGING",
            following: true,
            trackingErrorPercent: null,
            band: bandOut,
            halfLifeHours,
            message: null,
        };
    }
    const trackingErrorPercent = error * 100;
    if (bandOut && (price < bandOut.low || price > bandOut.high)) {
        return {
            verdict: "ADRIFT",
            following: true,
            trackingErrorPercent,
            band: bandOut,
            halfLifeHours,
            message: `This market is at ${price} while ${symbol} is at ${reference} — ` +
                `${trackingErrorPercent.toFixed(2)}% off, outside the band it should be tracking ` +
                `within. That normally means the reference feed stopped and has just resumed, or ` +
                `the tether has only now engaged. If it persists, check the symbol is mapped to ` +
                `the asset you think it is.`,
        };
    }
    if (bandOut) {
        const halfWidthLog = (Math.log(bandOut.high) - Math.log(bandOut.low)) / 2;
        const offsetLog = Math.abs(Math.log(price) - Math.log(reference));
        if (offsetLog > halfWidthLog * SETTLED_FRACTION) {
            return {
                verdict: "CONVERGING",
                following: true,
                trackingErrorPercent,
                band: bandOut,
                halfLifeHours,
                message: `Tracking ${symbol}, currently ${trackingErrorPercent.toFixed(2)}% away and ` +
                    `closing. The tether is a drift, not a jump — it closes half of any remaining ` +
                    `gap in about ${halfLifeHours ? halfLifeHours.toFixed(0) : "?"} hours.`,
            };
        }
    }
    return {
        verdict: "TRACKING",
        following: true,
        trackingErrorPercent,
        band: bandOut,
        halfLifeHours,
        message: null,
    };
}
