"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_SAMPLE_GAP_SECONDS = exports.SECONDS_PER_DAY = exports.SECONDS_PER_YEAR = void 0;
exports.annualisedVolatility = annualisedVolatility;
exports.dailyVolatility = dailyVolatility;
exports.SECONDS_PER_YEAR = 365 * 24 * 3600;
exports.SECONDS_PER_DAY = 24 * 3600;
exports.MIN_SAMPLE_GAP_SECONDS = 1;
const millis = (at) => {
    const value = at instanceof Date ? at.getTime() : new Date(at).getTime();
    return Number.isFinite(value) ? value : NaN;
};
function annualisedVolatility(samples) {
    return scaledVolatility(samples, exports.SECONDS_PER_YEAR);
}
function dailyVolatility(samples) {
    return scaledVolatility(samples, exports.SECONDS_PER_DAY);
}
function scaledVolatility(samples, horizonSeconds) {
    const ordered = samples
        .map((s) => ({ ...s, ms: millis(s.at) }))
        .filter((s) => Number.isFinite(s.ms))
        .sort((a, b) => a.ms - b.ms);
    const normalised = [];
    let previous = null;
    for (const sample of ordered) {
        if (sample.isRestart) {
            previous = null;
            continue;
        }
        const price = Number(sample.price);
        if (!Number.isFinite(price) || price <= 0)
            continue;
        if (previous) {
            const gapSeconds = Math.max((sample.ms - previous.ms) / 1000, exports.MIN_SAMPLE_GAP_SECONDS);
            const simpleReturn = (price - previous.price) / previous.price;
            normalised.push(simpleReturn / Math.sqrt(gapSeconds));
        }
        previous = { price, ms: sample.ms };
    }
    if (normalised.length < 2)
        return 0;
    const mean = normalised.reduce((a, b) => a + b, 0) / normalised.length;
    const variance = normalised.reduce((acc, r) => acc + (r - mean) ** 2, 0) / normalised.length;
    const perSecond = Math.sqrt(variance);
    const scaled = perSecond * Math.sqrt(horizonSeconds) * 100;
    return Number.isFinite(scaled) ? scaled : 0;
}
