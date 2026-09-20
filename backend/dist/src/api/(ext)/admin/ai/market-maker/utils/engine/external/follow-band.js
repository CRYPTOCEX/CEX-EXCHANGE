"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFollowBand = resolveFollowBand;
exports.trackingError = trackingError;
const TETHERED_MODES = new Set(["FOLLOW_EXTERNAL", "HYBRID"]);
const MAX_REFERENCE_DRIFT_RATIO = 10;
function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}
function resolveFollowBand(input) {
    const target = toNumber(input.targetPrice);
    const low = toNumber(input.priceRangeLow);
    const high = toNumber(input.priceRangeHigh);
    const configured = {
        anchorPrice: target > 0 ? target : 1,
        priceRangeLow: low > 0 ? low : 0,
        priceRangeHigh: high > 0 ? high : 0,
        following: false,
        referenceRejected: false,
    };
    if (!TETHERED_MODES.has(String(input.priceMode)))
        return configured;
    const reference = toNumber(input.externalPrice);
    if (!(reference > 0))
        return configured;
    if (target > 0) {
        const ratio = reference > target ? reference / target : target / reference;
        if (!(ratio <= MAX_REFERENCE_DRIFT_RATIO)) {
            return { ...configured, referenceRejected: true };
        }
    }
    if (!(low > 0) || !(high > low)) {
        return {
            anchorPrice: reference,
            priceRangeLow: 0,
            priceRangeHigh: 0,
            following: true,
            referenceRejected: false,
        };
    }
    const halfWidthLog = (Math.log(high) - Math.log(low)) / 2;
    if (!isFinite(halfWidthLog) || halfWidthLog <= 0)
        return configured;
    const factor = Math.exp(halfWidthLog);
    return {
        anchorPrice: reference,
        priceRangeLow: reference / factor,
        priceRangeHigh: reference * factor,
        following: true,
        referenceRejected: false,
    };
}
function trackingError(price, reference) {
    const p = toNumber(price);
    const r = toNumber(reference);
    if (!(p > 0) || !(r > 0))
        return null;
    return p / r - 1;
}
