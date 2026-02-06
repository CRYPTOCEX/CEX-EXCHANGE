"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intervalDurations = exports.intervals = void 0;
exports.getLatestOrdersForCandles = getLatestOrdersForCandles;
exports.normalizeToIntervalBoundary = normalizeToIntervalBoundary;
exports.fillCandleGaps = fillCandleGaps;
exports.intervals = [
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
    "3d",
    "1w",
];
exports.intervalDurations = {
    "1m": 60 * 1000,
    "3m": 3 * 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "2h": 2 * 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
};
function getLatestOrdersForCandles(orders) {
    const latestOrdersMap = {};
    orders.forEach((order) => {
        if (!latestOrdersMap[order.symbol] ||
            latestOrdersMap[order.symbol].updatedAt < order.updatedAt) {
            latestOrdersMap[order.symbol] = order;
        }
    });
    return Object.values(latestOrdersMap);
}
function normalizeToIntervalBoundary(timestamp, interval) {
    const date = new Date(timestamp);
    switch (interval) {
        case "1w":
            const dayOfWeek = date.getUTCDay();
            date.setUTCDate(date.getUTCDate() - dayOfWeek);
            date.setUTCHours(0, 0, 0, 0);
            break;
        case "3d":
            const epochDays3 = Math.floor(date.getTime() / (3 * 24 * 60 * 60 * 1000));
            return epochDays3 * 3 * 24 * 60 * 60 * 1000;
        case "1d":
            date.setUTCHours(0, 0, 0, 0);
            break;
        case "12h":
            const hour12 = Math.floor(date.getUTCHours() / 12) * 12;
            date.setUTCHours(hour12, 0, 0, 0);
            break;
        case "6h":
            const hour6 = Math.floor(date.getUTCHours() / 6) * 6;
            date.setUTCHours(hour6, 0, 0, 0);
            break;
        case "4h":
            const hour4 = Math.floor(date.getUTCHours() / 4) * 4;
            date.setUTCHours(hour4, 0, 0, 0);
            break;
        case "2h":
            const hour2 = Math.floor(date.getUTCHours() / 2) * 2;
            date.setUTCHours(hour2, 0, 0, 0);
            break;
        case "1h":
            date.setUTCMinutes(0, 0, 0);
            break;
        case "30m":
            const min30 = Math.floor(date.getUTCMinutes() / 30) * 30;
            date.setUTCMinutes(min30, 0, 0);
            break;
        case "15m":
            const min15 = Math.floor(date.getUTCMinutes() / 15) * 15;
            date.setUTCMinutes(min15, 0, 0);
            break;
        case "5m":
            const min5 = Math.floor(date.getUTCMinutes() / 5) * 5;
            date.setUTCMinutes(min5, 0, 0);
            break;
        case "3m":
            const min3 = Math.floor(date.getUTCMinutes() / 3) * 3;
            date.setUTCMinutes(min3, 0, 0);
            break;
        case "1m":
            date.setUTCSeconds(0, 0);
            break;
        default:
            date.setUTCMilliseconds(0);
    }
    return date.getTime();
}
function fillCandleGaps(candles, interval, fromTime, toTime, maxGapsToFill = 500) {
    const duration = exports.intervalDurations[interval] || 60000;
    if (candles.length === 0) {
        return [];
    }
    const candlesByNormalizedTime = new Map();
    for (const candle of candles) {
        const normalizedTime = normalizeToIntervalBoundary(candle[0], interval);
        const existing = candlesByNormalizedTime.get(normalizedTime);
        if (!existing) {
            candlesByNormalizedTime.set(normalizedTime, [
                normalizedTime,
                candle[1],
                candle[2],
                candle[3],
                candle[4],
                candle[5],
            ]);
        }
        else {
            existing[2] = Math.max(existing[2], candle[2]);
            existing[3] = Math.min(existing[3], candle[3]);
            existing[4] = candle[4];
            existing[5] = existing[5] + candle[5];
        }
    }
    const sortedCandles = Array.from(candlesByNormalizedTime.values()).sort((a, b) => a[0] - b[0]);
    const result = [];
    const normalizedTo = normalizeToIntervalBoundary(toTime, interval);
    for (let i = 0; i < sortedCandles.length; i++) {
        const currentCandle = sortedCandles[i];
        result.push(currentCandle);
        if (i < sortedCandles.length - 1) {
            const nextCandle = sortedCandles[i + 1];
            const currentTime = currentCandle[0];
            const nextTime = nextCandle[0];
            const timeDiff = nextTime - currentTime;
            if (timeDiff > duration * 1.5) {
                const fillPrice = currentCandle[4];
                let fillTime = currentTime + duration;
                let gapsFilled = 0;
                while (fillTime < nextTime && gapsFilled < maxGapsToFill) {
                    result.push([fillTime, fillPrice, fillPrice, fillPrice, fillPrice, 0]);
                    fillTime += duration;
                    gapsFilled++;
                }
            }
        }
    }
    const lastCandle = sortedCandles[sortedCandles.length - 1];
    const lastCandleTime = lastCandle[0];
    if (lastCandleTime < normalizedTo) {
        let fillTime = lastCandleTime + duration;
        let gapsFilled = 0;
        const fillPrice = lastCandle[4];
        while (fillTime <= normalizedTo && gapsFilled < maxGapsToFill) {
            result.push([fillTime, fillPrice, fillPrice, fillPrice, fillPrice, 0]);
            fillTime += duration;
            gapsFilled++;
        }
    }
    return result;
}
