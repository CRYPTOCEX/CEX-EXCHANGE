"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseChartDataPointSchema = void 0;
exports.validateAndNormalizeTimestamps = validateAndNormalizeTimestamps;
exports.isGapFillInProgress = isGapFillInProgress;
exports.waitForGapFill = waitForGapFill;
exports.registerGapFillOperation = registerGapFillOperation;
exports.clearGapFillOperation = clearGapFillOperation;
exports.executeWithGapFillLock = executeWithGapFillLock;
exports.getCachedOHLCV = getCachedOHLCV;
exports.saveOHLCVToCache = saveOHLCVToCache;
exports.intervalToMilliseconds = intervalToMilliseconds;
exports.findGapsInCachedData = findGapsInCachedData;
exports.fillGapsWithSyntheticCandles = fillGapsWithSyntheticCandles;
exports.validateAndCleanCandles = validateAndCleanCandles;
exports.repairCandleData = repairCandleData;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const redis_1 = require("@b/utils/redis");
const schema_1 = require("@b/utils/schema");
const console_1 = require("@b/utils/console");
const redis = redis_1.RedisSingleton.getInstance();
const cacheDirPath = path_1.default.resolve(process.cwd(), "data", "chart");
if (!fs_1.default.existsSync(cacheDirPath)) {
    fs_1.default.mkdirSync(cacheDirPath, { recursive: true });
}
exports.baseChartDataPointSchema = {
    timestamp: (0, schema_1.baseNumberSchema)("Timestamp for the data point"),
    open: (0, schema_1.baseNumberSchema)("Opening price for the data interval"),
    high: (0, schema_1.baseNumberSchema)("Highest price during the data interval"),
    low: (0, schema_1.baseNumberSchema)("Lowest price during the data interval"),
    close: (0, schema_1.baseNumberSchema)("Closing price for the data interval"),
    volume: (0, schema_1.baseNumberSchema)("Volume of trades during the data interval"),
};
function validateAndNormalizeTimestamps(from, to) {
    const now = Date.now();
    const minTimestamp = new Date("2020-01-01").getTime();
    const maxTimestamp = now + 3600000;
    if (from > maxTimestamp || to > maxTimestamp) {
        console_1.logger.warn("CHART", `Invalid future timestamps detected: from=${from}, to=${to}, now=${now}`);
        if (from > maxTimestamp * 10) {
            const defaultFrom = now - (500 * 60000);
            return { from: defaultFrom, to: now, isValid: false };
        }
    }
    const normalizedFrom = Math.max(from, minTimestamp);
    const normalizedTo = Math.min(to, now + 60000);
    return {
        from: normalizedFrom,
        to: normalizedTo,
        isValid: normalizedFrom < normalizedTo,
    };
}
function getCacheKey(symbol, interval) {
    return `ohlcv:${symbol}:${interval}`;
}
function compress(data) {
    return zlib_1.default.gzipSync(JSON.stringify(data));
}
function decompress(data) {
    return JSON.parse(zlib_1.default.gunzipSync(data).toString());
}
function getCacheFilePath(symbol, interval) {
    const symbolDirPath = path_1.default.join(cacheDirPath, symbol);
    if (!fs_1.default.existsSync(symbolDirPath)) {
        fs_1.default.mkdirSync(symbolDirPath, { recursive: true });
    }
    return path_1.default.join(symbolDirPath, `${interval}.json.gz`);
}
async function loadCacheFromFile(symbol, interval) {
    const cacheFilePath = getCacheFilePath(symbol, interval);
    if (fs_1.default.existsSync(cacheFilePath)) {
        try {
            const compressedData = await fs_1.default.promises.readFile(cacheFilePath);
            const data = decompress(compressedData);
            if (Array.isArray(data) && data.length > 0) {
                const firstItem = data[0];
                if (Array.isArray(firstItem) && firstItem.length >= 5 && typeof firstItem[0] === 'number') {
                    return data;
                }
                console_1.logger.warn("CHART", `Invalid cache data format for ${symbol}/${interval}, clearing cache`);
            }
        }
        catch (error) {
            console_1.logger.warn("CHART", `Failed to load cache file for ${symbol}/${interval}: ${error}`);
        }
    }
    return [];
}
async function saveCacheToFile(symbol, interval, data) {
    const cacheFilePath = getCacheFilePath(symbol, interval);
    const compressedData = compress(data);
    await fs_1.default.promises.writeFile(cacheFilePath, compressedData);
}
const cacheLocks = new Map();
const gapFillLocks = new Map();
const activeGapFills = new Map();
function getGapFillKey(symbol, interval) {
    return `gapfill:${symbol}:${interval}`;
}
function isGapFillInProgress(symbol, interval) {
    const key = getGapFillKey(symbol, interval);
    return gapFillLocks.has(key);
}
async function waitForGapFill(symbol, interval) {
    const key = getGapFillKey(symbol, interval);
    if (gapFillLocks.has(key)) {
        console_1.logger.debug("CHART", `Waiting for existing gap fill operation for ${symbol}/${interval}`);
        return await gapFillLocks.get(key) || null;
    }
    return null;
}
function registerGapFillOperation(symbol, interval, gaps) {
    const key = getGapFillKey(symbol, interval);
    const existing = activeGapFills.get(key);
    if (existing) {
        const isRecent = Date.now() - existing.startTime < 30000;
        if (isRecent) {
            const hasOverlap = gaps.some(newGap => existing.gaps.some(existingGap => newGap.gapStart < existingGap.gapEnd && newGap.gapEnd > existingGap.gapStart));
            if (hasOverlap) {
                console_1.logger.debug("CHART", `Skipping duplicate gap fill for ${symbol}/${interval} - operation already in progress`);
                return false;
            }
        }
    }
    activeGapFills.set(key, { startTime: Date.now(), gaps });
    return true;
}
function clearGapFillOperation(symbol, interval) {
    const key = getGapFillKey(symbol, interval);
    activeGapFills.delete(key);
}
async function executeWithGapFillLock(symbol, interval, operation) {
    const key = getGapFillKey(symbol, interval);
    if (gapFillLocks.has(key)) {
        console_1.logger.debug("CHART", `Waiting for existing gap fill lock for ${symbol}/${interval}`);
        await gapFillLocks.get(key);
    }
    const operationPromise = operation();
    gapFillLocks.set(key, operationPromise);
    try {
        return await operationPromise;
    }
    finally {
        gapFillLocks.delete(key);
    }
}
async function getCachedOHLCV(symbol, interval, from, to) {
    const cacheKey = getCacheKey(symbol, interval);
    if (cacheLocks.has(cacheKey)) {
        await cacheLocks.get(cacheKey);
    }
    try {
        let cachedData = await Promise.race([
            redis.get(cacheKey),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000))
        ]).catch(() => null);
        if (!cachedData) {
            const lockPromise = loadCacheFromFileWithLock(symbol, interval, cacheKey);
            cacheLocks.set(cacheKey, lockPromise);
            try {
                const dataFromFile = await lockPromise;
                if (dataFromFile.length > 0) {
                    await Promise.race([
                        redis.set(cacheKey, JSON.stringify(dataFromFile)),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis SET timeout')), 3000))
                    ]).catch(() => {
                        console_1.logger.warn("CHART", `Failed to cache data in Redis for ${cacheKey}`);
                    });
                    cachedData = JSON.stringify(dataFromFile);
                }
                else {
                    return [];
                }
            }
            finally {
                cacheLocks.delete(cacheKey);
            }
        }
        const intervalCache = JSON.parse(cachedData);
        const startIndex = binarySearch(intervalCache, from);
        const endIndex = binarySearch(intervalCache, to, true);
        return intervalCache.slice(startIndex, endIndex + 1);
    }
    catch (error) {
        console_1.logger.error("CHART", `Error getting cached OHLCV for ${cacheKey}: ${error}`);
        return [];
    }
}
async function loadCacheFromFileWithLock(symbol, interval, cacheKey) {
    try {
        return await loadCacheFromFile(symbol, interval);
    }
    catch (error) {
        console_1.logger.error("CHART", `Error loading cache from file for ${cacheKey}: ${error}`);
        return [];
    }
}
function binarySearch(arr, target, findEnd = false) {
    let left = 0;
    let right = arr.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid][0] === target) {
            return mid;
        }
        if (arr[mid][0] < target) {
            left = mid + 1;
        }
        else {
            right = mid - 1;
        }
    }
    return findEnd ? right : left;
}
async function saveOHLCVToCache(symbol, interval, data) {
    const cacheKey = getCacheKey(symbol, interval);
    if (cacheLocks.has(cacheKey)) {
        await cacheLocks.get(cacheKey);
    }
    const savePromise = performCacheSave(symbol, interval, data, cacheKey);
    cacheLocks.set(cacheKey, savePromise);
    try {
        await savePromise;
    }
    finally {
        cacheLocks.delete(cacheKey);
    }
}
async function performCacheSave(symbol, interval, data, cacheKey) {
    try {
        let intervalCache = [];
        const cachedData = await Promise.race([
            redis.get(cacheKey),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis GET timeout')), 3000))
        ]).catch(() => null);
        if (cachedData) {
            try {
                intervalCache = JSON.parse(cachedData);
            }
            catch (error) {
                console_1.logger.warn("CHART", `Failed to parse cached data for ${cacheKey}, using empty array`);
                intervalCache = [];
            }
        }
        const updatedCache = mergeAndSortData(intervalCache, data);
        await Promise.race([
            redis.set(cacheKey, JSON.stringify(updatedCache)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis SET timeout')), 3000))
        ]).catch((error) => {
            console_1.logger.warn("CHART", `Failed to save cache to Redis for ${cacheKey}: ${error}`);
        });
        await Promise.race([
            saveCacheToFile(symbol, interval, updatedCache),
            new Promise((_, reject) => setTimeout(() => reject(new Error('File save timeout')), 5000))
        ]).catch((error) => {
            console_1.logger.warn("CHART", `Failed to save cache to file for ${cacheKey}: ${error}`);
        });
    }
    catch (error) {
        console_1.logger.error("CHART", `Error in performCacheSave for ${cacheKey}: ${error}`);
        throw error;
    }
}
function mergeAndSortData(existingData, newData) {
    const merged = [...existingData, ...newData];
    merged.sort((a, b) => a[0] - b[0]);
    return merged.filter((item, index, self) => index === 0 || item[0] !== self[index - 1][0]);
}
function intervalToMilliseconds(interval) {
    const intervalMap = {
        "1m": 60 * 1000,
        "3m": 3 * 60 * 1000,
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "30m": 30 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "2h": 2 * 60 * 60 * 1000,
        "4h": 4 * 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "8h": 8 * 60 * 60 * 1000,
        "12h": 12 * 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
        "3d": 3 * 24 * 60 * 60 * 1000,
        "1w": 7 * 24 * 60 * 60 * 1000,
        "1M": 30 * 24 * 60 * 60 * 1000,
    };
    return intervalMap[interval] || 0;
}
function findGapsInCachedData(cachedData, from, to, interval) {
    const gaps = [];
    const currentTimestamp = Date.now();
    const intervalMs = intervalToMilliseconds(interval);
    let currentStart = Math.floor(from / intervalMs) * intervalMs;
    const currentCandleStart = Math.floor(currentTimestamp / intervalMs) * intervalMs;
    const adjustedTo = Math.min(to, currentCandleStart);
    console_1.logger.debug("CHART", `findGaps: now=${new Date(currentTimestamp).toISOString()}, currentCandleStart=${new Date(currentCandleStart).toISOString()}, adjustedTo=${new Date(adjustedTo).toISOString()}`);
    for (const bar of cachedData) {
        const barTime = bar[0];
        if (barTime > currentStart + intervalMs * 1.5) {
            gaps.push({ gapStart: currentStart, gapEnd: barTime });
        }
        currentStart = barTime + intervalMs;
    }
    if (currentStart < adjustedTo) {
        const gapMinutes = Math.round((adjustedTo - currentStart) / 60000);
        const lastCachedCandleTime = cachedData.length > 0 ? cachedData[cachedData.length - 1][0] : 0;
        console_1.logger.debug("CHART", `Gap at end: lastCached=${new Date(lastCachedCandleTime).toISOString()}, nextExpected=${new Date(currentStart).toISOString()}, adjustedTo=${new Date(adjustedTo).toISOString()}, gap=${gapMinutes} minutes`);
        gaps.push({ gapStart: currentStart, gapEnd: adjustedTo });
    }
    return gaps;
}
function fillGapsWithSyntheticCandles(cachedData, from, to, interval) {
    if (cachedData.length === 0) {
        return cachedData;
    }
    const intervalMs = intervalToMilliseconds(interval);
    const now = Date.now();
    const adjustedTo = Math.min(to, now);
    const result = [];
    let lastPrice = cachedData[0][4];
    let currentTime = Math.floor(from / intervalMs) * intervalMs;
    let dataIndex = 0;
    while (currentTime < adjustedTo && dataIndex <= cachedData.length) {
        if (dataIndex < cachedData.length) {
            const realCandle = cachedData[dataIndex];
            const realTime = realCandle[0];
            if (Math.abs(realTime - currentTime) < intervalMs * 0.5) {
                result.push(realCandle);
                lastPrice = realCandle[4];
                dataIndex++;
                currentTime = realTime + intervalMs;
                continue;
            }
            if (realTime < currentTime) {
                dataIndex++;
                continue;
            }
        }
        const gapSize = dataIndex < cachedData.length
            ? (cachedData[dataIndex][0] - currentTime) / intervalMs
            : (adjustedTo - currentTime) / intervalMs;
        if (gapSize <= 50) {
            result.push([
                currentTime,
                lastPrice,
                lastPrice,
                lastPrice,
                lastPrice,
                0,
            ]);
        }
        currentTime += intervalMs;
        if (result.length > 10000) {
            console_1.logger.warn("CHART", `Too many candles generated, stopping at ${result.length}`);
            break;
        }
    }
    return result;
}
function validateAndCleanCandles(data) {
    const now = Date.now();
    const minTimestamp = new Date("2015-01-01").getTime();
    const basicValid = data.filter((candle) => {
        if (!Array.isArray(candle) || candle.length < 5)
            return false;
        const [timestamp, open, high, low, close] = candle;
        if (typeof timestamp !== 'number' || timestamp < minTimestamp || timestamp > now + 3600000) {
            return false;
        }
        if (typeof open !== 'number' || typeof high !== 'number' ||
            typeof low !== 'number' || typeof close !== 'number') {
            return false;
        }
        if (high < low || high < open || high < close || low > open || low > close) {
            return false;
        }
        if (!isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) {
            return false;
        }
        if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
            return false;
        }
        return true;
    });
    return removeAnomalousCandles(basicValid);
}
function removeAnomalousCandles(candles) {
    if (candles.length < 3)
        return candles;
    const sorted = [...candles].sort((a, b) => a[0] - b[0]);
    const closeToOpenGaps = [];
    const candleRanges = [];
    for (let i = 1; i < sorted.length; i++) {
        const prevClose = sorted[i - 1][4];
        const currOpen = sorted[i][1];
        const gap = Math.abs(currOpen - prevClose);
        closeToOpenGaps.push(gap);
        const range = sorted[i][2] - sorted[i][3];
        candleRanges.push(range);
    }
    const sortedGaps = [...closeToOpenGaps].sort((a, b) => a - b);
    const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)] || 0;
    const avgGap = closeToOpenGaps.reduce((a, b) => a + b, 0) / closeToOpenGaps.length || 0;
    const sortedRanges = [...candleRanges].sort((a, b) => a - b);
    const medianRange = sortedRanges[Math.floor(sortedRanges.length / 2)] || 0;
    const avgRange = candleRanges.reduce((a, b) => a + b, 0) / candleRanges.length || 0;
    const gapThreshold = Math.max(medianGap * 10, avgGap * 5);
    const rangeThreshold = Math.max(medianRange * 10, avgRange * 5);
    const result = [];
    let removedCount = 0;
    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const [timestamp, open, high, low, close] = current;
        const currentRange = high - low;
        let isAnomaly = false;
        let reason = "";
        if (i > 0) {
            const prevClose = sorted[i - 1][4];
            const gapFromPrev = Math.abs(open - prevClose);
            if (gapThreshold > 0 && gapFromPrev > gapThreshold) {
                if (i < sorted.length - 1) {
                    const nextOpen = sorted[i + 1][1];
                    const nextGapFromCurrent = Math.abs(nextOpen - close);
                    const nextGapFromPrev = Math.abs(nextOpen - prevClose);
                    if (nextGapFromPrev < nextGapFromCurrent * 0.5) {
                        isAnomaly = true;
                        reason = `gap from prev: ${gapFromPrev.toFixed(2)} > threshold ${gapThreshold.toFixed(2)}, next candle reverts`;
                    }
                }
            }
        }
        if (!isAnomaly && rangeThreshold > 0 && currentRange > rangeThreshold) {
            const neighborRanges = [];
            for (let j = Math.max(0, i - 3); j < Math.min(sorted.length, i + 4); j++) {
                if (j !== i) {
                    neighborRanges.push(sorted[j][2] - sorted[j][3]);
                }
            }
            if (neighborRanges.length > 0) {
                const avgNeighborRange = neighborRanges.reduce((a, b) => a + b, 0) / neighborRanges.length;
                if (currentRange > avgNeighborRange * 8) {
                    isAnomaly = true;
                    reason = `range ${currentRange.toFixed(2)} > 8x neighbor avg ${avgNeighborRange.toFixed(2)}`;
                }
            }
        }
        if (!isAnomaly) {
            const body = Math.abs(close - open);
            const upperWick = high - Math.max(open, close);
            const lowerWick = Math.min(open, close) - low;
            if (body > 0 && (upperWick > body * 20 || lowerWick > body * 20)) {
                const neighborRanges = [];
                for (let j = Math.max(0, i - 3); j < Math.min(sorted.length, i + 4); j++) {
                    if (j !== i) {
                        neighborRanges.push(sorted[j][2] - sorted[j][3]);
                    }
                }
                if (neighborRanges.length > 0) {
                    const avgNeighborRange = neighborRanges.reduce((a, b) => a + b, 0) / neighborRanges.length;
                    const maxWick = Math.max(upperWick, lowerWick);
                    if (maxWick > avgNeighborRange * 5) {
                        isAnomaly = true;
                        reason = `extreme wick: ${maxWick.toFixed(2)} > 5x neighbor range ${avgNeighborRange.toFixed(2)}`;
                    }
                }
            }
        }
        if (isAnomaly) {
            console_1.logger.warn("CHART", `Removing anomalous candle: time=${new Date(timestamp).toISOString()}, O=${open.toFixed(2)}, H=${high.toFixed(2)}, L=${low.toFixed(2)}, C=${close.toFixed(2)}, reason: ${reason}`);
            removedCount++;
        }
        else {
            result.push(current);
        }
    }
    if (removedCount > 0) {
        console_1.logger.info("CHART", `Removed ${removedCount} anomalous candles from dataset`);
    }
    return result;
}
function repairCandleData(candles, interval) {
    if (candles.length < 2)
        return candles;
    const intervalMs = intervalToMilliseconds(interval);
    const sorted = [...candles].sort((a, b) => a[0] - b[0]);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        result.push(current);
        if (i < sorted.length - 1) {
            const next = sorted[i + 1];
            const gap = next[0] - current[0];
            const missingCandles = Math.round(gap / intervalMs) - 1;
            if (missingCandles > 0 && missingCandles <= 3) {
                const currentClose = current[4];
                const nextOpen = next[1];
                for (let j = 1; j <= missingCandles; j++) {
                    const ratio = j / (missingCandles + 1);
                    const interpolatedPrice = currentClose + (nextOpen - currentClose) * ratio;
                    const interpolatedTime = current[0] + intervalMs * j;
                    result.push([
                        interpolatedTime,
                        interpolatedPrice,
                        interpolatedPrice,
                        interpolatedPrice,
                        interpolatedPrice,
                        0,
                    ]);
                }
                console_1.logger.debug("CHART", `Interpolated ${missingCandles} missing candles between ${new Date(current[0]).toISOString()} and ${new Date(next[0]).toISOString()}`);
            }
        }
    }
    return result.sort((a, b) => a[0] - b[0]);
}
