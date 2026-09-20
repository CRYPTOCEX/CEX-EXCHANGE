"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_BACKFILL_DEPTH_MS = exports.BACKFILL_INTERVALS = void 0;
exports.planBackfillWindow = planBackfillWindow;
exports.selectImportableBars = selectImportableBars;
const candles_1 = require("@b/api/(ext)/ecosystem/utils/candles");
exports.BACKFILL_INTERVALS = [
    "1m",
    "3m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "4h",
    "6h",
    "12h",
    "1d",
];
exports.MAX_BACKFILL_DEPTH_MS = {
    "1m": 30 * 24 * 60 * 60 * 1000,
    "3m": 60 * 24 * 60 * 60 * 1000,
    "5m": 180 * 24 * 60 * 60 * 1000,
    "15m": 180 * 24 * 60 * 60 * 1000,
    "30m": 365 * 24 * 60 * 60 * 1000,
    "1h": 730 * 24 * 60 * 60 * 1000,
    "2h": 730 * 24 * 60 * 60 * 1000,
    "4h": 1825 * 24 * 60 * 60 * 1000,
    "6h": 1825 * 24 * 60 * 60 * 1000,
    "12h": 1825 * 24 * 60 * 60 * 1000,
    "1d": 1825 * 24 * 60 * 60 * 1000,
};
function isBackfillInterval(interval) {
    return exports.BACKFILL_INTERVALS.includes(interval);
}
function planBackfillWindow(input) {
    const { interval, nowMs, oldestExistingBucketMs } = input;
    if (!isBackfillInterval(interval)) {
        return {
            status: "REFUSED",
            reason: `${interval} cannot be imported from a provider. The ecosystem floors 3d from ` +
                `the epoch and starts weeks on Sunday UTC, so provider bars for those intervals ` +
                `land beside the existing series rather than on it. Import 1d and re-aggregate.`,
        };
    }
    if (!Number.isFinite(nowMs) || nowMs <= 0) {
        return { status: "REFUSED", reason: "A valid current time is required." };
    }
    if (oldestExistingBucketMs === null ||
        oldestExistingBucketMs === undefined ||
        !Number.isFinite(oldestExistingBucketMs)) {
        return {
            status: "REFUSED",
            reason: `This market has no ${interval} candles yet, so an import would become its ` +
                `newest price — its seed on restart, its ticker last, and the price binaries ` +
                `enter and settle at. Start the market maker (or take one real fill) so a live ` +
                `candle exists, reconcile its price to the provider's, then import behind it.`,
        };
    }
    const intervalMs = candles_1.intervalDurations[interval];
    if (!intervalMs || intervalMs <= 0) {
        return { status: "REFUSED", reason: `Unknown interval duration for ${interval}.` };
    }
    const lastClosedBucket = (0, candles_1.normalizeToIntervalBoundary)(nowMs, interval) - intervalMs;
    const headCap = (0, candles_1.normalizeToIntervalBoundary)(oldestExistingBucketMs, interval) - intervalMs;
    const toMs = Math.min(lastClosedBucket, headCap);
    const depthFloor = toMs - exports.MAX_BACKFILL_DEPTH_MS[interval];
    const requested = Number(input.requestedFromMs);
    const desiredFrom = Number.isFinite(requested) ? requested : depthFloor;
    const fromMs = (0, candles_1.normalizeToIntervalBoundary)(Math.max(desiredFrom, depthFloor), interval);
    if (fromMs > toMs) {
        return {
            status: "NOTHING_TO_DO",
            reason: `The ${interval} series already reaches back past the requested window; there is ` +
                `nothing older to import.`,
        };
    }
    return {
        status: "OK",
        fromMs,
        toMs,
        bucketCount: Math.floor((toMs - fromMs) / intervalMs) + 1,
    };
}
function selectImportableBars(bars, window, interval) {
    if (!Array.isArray(bars))
        return [];
    const intervalMs = candles_1.intervalDurations[interval];
    if (!intervalMs)
        return [];
    const seen = new Set();
    const out = [];
    for (const bar of bars) {
        const ts = Number(bar === null || bar === void 0 ? void 0 : bar.timestamp);
        if (!Number.isFinite(ts))
            continue;
        if (ts < window.fromMs || ts > window.toMs)
            continue;
        if ((0, candles_1.normalizeToIntervalBoundary)(ts, interval) !== ts)
            continue;
        if (seen.has(ts))
            continue;
        seen.add(ts);
        out.push(bar);
    }
    return out.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}
