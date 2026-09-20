"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYMBOL_PATTERN = exports.SUPPORTED_INTERVALS = exports.baseChartDataPointSchema = void 0;
exports.isSupportedInterval = isSupportedInterval;
exports.intervalToMilliseconds = intervalToMilliseconds;
exports.floorToInterval = floorToInterval;
exports.advanceInterval = advanceInterval;
exports.countIntervals = countIntervals;
exports.lastClosedBoundary = lastClosedBoundary;
exports.validateAndCleanCandles = validateAndCleanCandles;
exports.mergeCandles = mergeCandles;
exports.closedBarsOnly = closedBarsOnly;
exports.validateAndNormalizeTimestamps = validateAndNormalizeTimestamps;
exports.isValidSymbol = isValidSymbol;
exports.getCacheFilePath = getCacheFilePath;
exports.loadSeries = loadSeries;
exports.readSeriesFile = readSeriesFile;
exports.dropSeries = dropSeries;
exports.saveOHLCVToCache = saveOHLCVToCache;
exports.getCachedOHLCV = getCachedOHLCV;
exports.findGapsInCachedData = findGapsInCachedData;
exports.isGapFillInProgress = isGapFillInProgress;
exports.waitForGapFill = waitForGapFill;
exports.executeWithGapFillLock = executeWithGapFillLock;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const redis_1 = require("@b/utils/redis");
const schema_1 = require("@b/utils/schema");
const console_1 = require("@b/utils/console");
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
const GRID = {
    "1m": { ms: 60000, anchor: 0 },
    "3m": { ms: 180000, anchor: 0 },
    "5m": { ms: 300000, anchor: 0 },
    "15m": { ms: 900000, anchor: 0 },
    "30m": { ms: 1800000, anchor: 0 },
    "1h": { ms: 3600000, anchor: 0 },
    "2h": { ms: 7200000, anchor: 0 },
    "4h": { ms: 14400000, anchor: 0 },
    "6h": { ms: 21600000, anchor: 0 },
    "8h": { ms: 28800000, anchor: 0 },
    "12h": { ms: 43200000, anchor: 0 },
    "1d": { ms: 86400000, anchor: 0 },
    "3d": { ms: 259200000, anchor: 86400000 },
    "1w": { ms: 604800000, anchor: 345600000 },
};
const MONTH = "1M";
const NOMINAL_MONTH_MS = 30 * 86400000;
exports.SUPPORTED_INTERVALS = [...Object.keys(GRID), MONTH];
function isSupportedInterval(interval) {
    return interval === MONTH || Object.prototype.hasOwnProperty.call(GRID, interval);
}
function intervalToMilliseconds(interval) {
    var _a;
    var _b;
    if (interval === MONTH)
        return NOMINAL_MONTH_MS;
    return (_b = (_a = GRID[interval]) === null || _a === void 0 ? void 0 : _a.ms) !== null && _b !== void 0 ? _b : 0;
}
function floorToInterval(ts, interval) {
    if (interval === MONTH) {
        const d = new Date(ts);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    }
    const grid = GRID[interval];
    if (!grid)
        return NaN;
    return Math.floor((ts - grid.anchor) / grid.ms) * grid.ms + grid.anchor;
}
function advanceInterval(boundary, interval, count = 1) {
    if (interval === MONTH) {
        const d = new Date(boundary);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + count, 1);
    }
    const grid = GRID[interval];
    if (!grid)
        return NaN;
    return boundary + grid.ms * count;
}
function countIntervals(from, to, interval) {
    if (to <= from)
        return 0;
    if (interval === MONTH) {
        const a = new Date(floorToInterval(from, MONTH));
        const b = new Date(floorToInterval(to, MONTH));
        return Math.max(0, (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()));
    }
    const grid = GRID[interval];
    if (!grid)
        return 0;
    return Math.max(0, Math.floor((to - from) / grid.ms));
}
function lastClosedBoundary(interval, now = Date.now()) {
    return advanceInterval(floorToInterval(now, interval), interval, -1);
}
const MIN_BAR_TIME = Date.UTC(2009, 0, 3);
function validateAndCleanCandles(data, interval) {
    if (!Array.isArray(data) || data.length === 0)
        return [];
    const maxTime = Date.now() + 60000;
    const byTime = new Map();
    for (const row of data) {
        if (!Array.isArray(row) || row.length < 5)
            continue;
        const time = Number(row[0]);
        const open = Number(row[1]);
        const high = Number(row[2]);
        const low = Number(row[3]);
        const close = Number(row[4]);
        const volume = row.length > 5 && Number.isFinite(Number(row[5])) ? Number(row[5]) : 0;
        if (!Number.isFinite(time) || time < MIN_BAR_TIME || time > maxTime)
            continue;
        if (![open, high, low, close].every(Number.isFinite))
            continue;
        if (open <= 0 || high <= 0 || low <= 0 || close <= 0)
            continue;
        if (volume < 0)
            continue;
        if (high < low)
            continue;
        if (high < Math.max(open, close) || low > Math.min(open, close))
            continue;
        if (interval) {
            const boundary = floorToInterval(time, interval);
            if (!Number.isFinite(boundary) || boundary !== time)
                continue;
        }
        byTime.set(time, [time, open, high, low, close, volume]);
    }
    return [...byTime.values()].sort((a, b) => a[0] - b[0]);
}
function mergeCandles(existing, incoming) {
    if (incoming.length === 0)
        return existing;
    const byTime = new Map();
    for (const c of existing)
        byTime.set(c[0], c);
    for (const c of incoming)
        byTime.set(c[0], c);
    return [...byTime.values()].sort((a, b) => a[0] - b[0]);
}
function closedBarsOnly(candles, interval, now = Date.now()) {
    const cutoff = lastClosedBoundary(interval, now);
    if (!Number.isFinite(cutoff))
        return candles;
    return candles.filter((c) => c[0] <= cutoff);
}
function validateAndNormalizeTimestamps(from, to) {
    const now = Date.now();
    const maxTimestamp = now + 3600000;
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return { from: now - 500 * 60000, to: now, isValid: false };
    }
    if (from > maxTimestamp * 10 || to > maxTimestamp * 10) {
        console_1.logger.warn("CHART", `Out-of-range timestamps (from=${from}, to=${to}); falling back to a default window`);
        return { from: now - 500 * 60000, to: now, isValid: false };
    }
    const normalizedFrom = Math.max(from, MIN_BAR_TIME);
    const normalizedTo = Math.min(to, now + 60000);
    return {
        from: normalizedFrom,
        to: normalizedTo,
        isValid: normalizedFrom < normalizedTo,
    };
}
const REDIS_TTL_SECONDS = 24 * 60 * 60;
const REDIS_TIMEOUT_MS = 3000;
const MAX_SERIES_BARS = 250000;
function getCacheKey(symbol, interval) {
    return `ohlcv:${symbol}:${interval}`;
}
exports.SYMBOL_PATTERN = /^[A-Z0-9]+\/[A-Z0-9]+$/;
function isValidSymbol(symbol) {
    return typeof symbol === "string" && exports.SYMBOL_PATTERN.test(symbol);
}
function getCacheFilePath(symbol, interval) {
    if (!isValidSymbol(symbol) || !isSupportedInterval(interval)) {
        throw new Error(`Refusing to build a cache path for ${symbol}/${interval}`);
    }
    return path_1.default.join(cacheDirPath, ...symbol.split("/"), `${interval}.json.gz`);
}
function redisOrNull() {
    try {
        return redis_1.RedisSingleton.getInstance();
    }
    catch (_a) {
        return null;
    }
}
function withTimeout(work, ms, label) {
    let timer;
    return Promise.race([
        work,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
        }),
    ]).finally(() => clearTimeout(timer));
}
async function readFileSeries(symbol, interval) {
    var _a, _b;
    const file = getCacheFilePath(symbol, interval);
    let compressed;
    try {
        compressed = await fs_1.default.promises.readFile(file);
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === "ENOENT")
            return { state: "absent" };
        return { state: "unreadable", reason: (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error) };
    }
    try {
        const parsed = JSON.parse(zlib_1.default.gunzipSync(compressed).toString());
        if (!Array.isArray(parsed)) {
            return { state: "unreadable", reason: "cache file does not hold an array" };
        }
        return { state: "ok", candles: parsed };
    }
    catch (error) {
        return { state: "unreadable", reason: (_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : String(error) };
    }
}
async function readFileSeriesOrEmpty(symbol, interval) {
    const read = await readFileSeries(symbol, interval);
    if (read.state === "ok")
        return read.candles;
    if (read.state === "unreadable") {
        console_1.logger.warn("CHART", `Cannot read cache file for ${symbol}/${interval}: ${read.reason}`);
    }
    return [];
}
async function writeFileSeries(symbol, interval, candles) {
    const file = getCacheFilePath(symbol, interval);
    await fs_1.default.promises.mkdir(path_1.default.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now().toString(36)}.tmp`;
    try {
        await fs_1.default.promises.writeFile(temp, zlib_1.default.gzipSync(JSON.stringify(candles)));
        for (let attempt = 1;; attempt++) {
            try {
                await fs_1.default.promises.rename(temp, file);
                return;
            }
            catch (error) {
                const retryable = (error === null || error === void 0 ? void 0 : error.code) === "EPERM" || (error === null || error === void 0 ? void 0 : error.code) === "EBUSY";
                if (!retryable || attempt >= 3)
                    throw error;
                await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
            }
        }
    }
    finally {
        await fs_1.default.promises.rm(temp, { force: true }).catch(() => { });
    }
}
async function readRedisSeries(symbol, interval) {
    const redis = redisOrNull();
    if (!redis)
        return null;
    try {
        const raw = await withTimeout(Promise.resolve(redis.get(getCacheKey(symbol, interval))), REDIS_TIMEOUT_MS, "Redis GET");
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    }
    catch (_a) {
        return null;
    }
}
async function writeRedisSeries(symbol, interval, candles) {
    var _a;
    const redis = redisOrNull();
    if (!redis)
        return;
    try {
        await withTimeout(Promise.resolve(redis.set(getCacheKey(symbol, interval), JSON.stringify(candles), "EX", REDIS_TTL_SECONDS)), REDIS_TIMEOUT_MS, "Redis SET");
    }
    catch (error) {
        console_1.logger.warn("CHART", `Failed to mirror ${symbol}/${interval} to Redis: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
}
async function loadSeries(symbol, interval) {
    const fromRedis = await readRedisSeries(symbol, interval);
    if (fromRedis && fromRedis.length > 0)
        return fromRedis;
    const fromFile = await readFileSeriesOrEmpty(symbol, interval);
    if (fromFile.length > 0) {
        await writeRedisSeries(symbol, interval, fromFile);
    }
    return fromFile;
}
const MAX_CORRUPT_STRIKES = 3;
const corruptStrikes = new Map();
async function quarantineFile(symbol, interval) {
    var _a;
    const file = getCacheFilePath(symbol, interval);
    const aside = `${file}.corrupt-${Date.now().toString(36)}`;
    try {
        await fs_1.default.promises.rename(file, aside);
        console_1.logger.error("CHART", `${symbol}/${interval}: cache file unreadable ${MAX_CORRUPT_STRIKES} times; moved to ${path_1.default.basename(aside)} and starting a fresh series`);
    }
    catch (error) {
        console_1.logger.error("CHART", `${symbol}/${interval}: could not move the unreadable cache file aside: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
}
async function readSeriesFile(symbol, interval) {
    return readFileSeriesOrEmpty(symbol, interval);
}
async function dropSeries(symbol, interval, layers = {}) {
    var _a;
    const dropFile = layers.file !== false;
    const dropRedis = layers.redis !== false;
    let file = false;
    let redis = false;
    if (dropFile) {
        try {
            await fs_1.default.promises.unlink(getCacheFilePath(symbol, interval));
            file = true;
        }
        catch (error) {
            if ((error === null || error === void 0 ? void 0 : error.code) !== "ENOENT")
                throw error;
        }
    }
    const client = dropRedis ? redisOrNull() : null;
    if (client) {
        try {
            const removed = await withTimeout(Promise.resolve(client.del(getCacheKey(symbol, interval))), REDIS_TIMEOUT_MS, "Redis DEL");
            redis = Number(removed) > 0;
        }
        catch (error) {
            console_1.logger.warn("CHART", `Failed to drop ${symbol}/${interval} from Redis: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        }
    }
    return { file, redis };
}
const writeChains = new Map();
function serializeWrite(key, task) {
    var _a;
    const previous = (_a = writeChains.get(key)) !== null && _a !== void 0 ? _a : Promise.resolve();
    const next = previous.then(task, task).catch((error) => {
        var _a;
        console_1.logger.error("CHART", `Cache write failed for ${key}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    });
    writeChains.set(key, next);
    void next.then(() => {
        if (writeChains.get(key) === next)
            writeChains.delete(key);
    });
    return next;
}
async function saveOHLCVToCache(symbol, interval, data) {
    const incoming = closedBarsOnly(validateAndCleanCandles(data, interval), interval);
    if (incoming.length === 0)
        return;
    await serializeWrite(getCacheKey(symbol, interval), async () => {
        var _a;
        const read = await readFileSeries(symbol, interval);
        if (read.state === "unreadable") {
            const strikes = ((_a = corruptStrikes.get(getCacheKey(symbol, interval))) !== null && _a !== void 0 ? _a : 0) + 1;
            corruptStrikes.set(getCacheKey(symbol, interval), strikes);
            console_1.logger.error("CHART", `${symbol}/${interval}: cache file unreadable (${read.reason}); skipping this save to avoid overwriting history (strike ${strikes}/${MAX_CORRUPT_STRIKES})`);
            if (strikes < MAX_CORRUPT_STRIKES)
                return;
            await quarantineFile(symbol, interval);
            corruptStrikes.delete(getCacheKey(symbol, interval));
        }
        else {
            corruptStrikes.delete(getCacheKey(symbol, interval));
        }
        const existing = read.state === "ok" ? read.candles : [];
        let merged = mergeCandles(existing, incoming);
        if (merged.length > MAX_SERIES_BARS) {
            console_1.logger.warn("CHART", `${symbol}/${interval}: series reached ${merged.length} bars, trimming to ${MAX_SERIES_BARS}`);
            merged = merged.slice(merged.length - MAX_SERIES_BARS);
        }
        await writeFileSeries(symbol, interval, merged);
        await writeRedisSeries(symbol, interval, merged);
    });
}
function lowerBound(series, target) {
    let low = 0;
    let high = series.length;
    while (low < high) {
        const mid = (low + high) >> 1;
        if (series[mid][0] < target)
            low = mid + 1;
        else
            high = mid;
    }
    return low;
}
function upperBound(series, target) {
    let low = 0;
    let high = series.length;
    while (low < high) {
        const mid = (low + high) >> 1;
        if (series[mid][0] <= target)
            low = mid + 1;
        else
            high = mid;
    }
    return low;
}
async function getCachedOHLCV(symbol, interval, from, to) {
    var _a;
    try {
        const series = closedBarsOnly(validateAndCleanCandles(await loadSeries(symbol, interval), interval), interval);
        if (series.length === 0)
            return [];
        return series.slice(lowerBound(series, from), upperBound(series, to));
    }
    catch (error) {
        console_1.logger.error("CHART", `Error reading cached OHLCV for ${symbol}/${interval}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        return [];
    }
}
function findGapsInCachedData(cachedData, from, to, interval, maxGaps = 64) {
    if (!isSupportedInterval(interval))
        return [];
    const start = floorToInterval(from, interval);
    const end = Math.min(floorToInterval(to, interval), lastClosedBoundary(interval));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
        return [];
    const gaps = [];
    let expected = start;
    for (const bar of cachedData) {
        const time = bar[0];
        if (time < expected)
            continue;
        if (time > end)
            break;
        if (time > expected) {
            gaps.push({ gapStart: expected, gapEnd: time });
            if (gaps.length >= maxGaps)
                return gaps;
        }
        expected = advanceInterval(time, interval);
    }
    if (expected <= end) {
        gaps.push({ gapStart: expected, gapEnd: advanceInterval(end, interval) });
    }
    return gaps;
}
const gapFillLocks = new Map();
function getGapFillKey(symbol, interval) {
    return `gapfill:${symbol}:${interval}`;
}
function isGapFillInProgress(symbol, interval) {
    return gapFillLocks.has(getGapFillKey(symbol, interval));
}
async function waitForGapFill(symbol, interval) {
    const inFlight = gapFillLocks.get(getGapFillKey(symbol, interval));
    if (!inFlight)
        return;
    await inFlight.catch(() => { });
}
async function executeWithGapFillLock(symbol, interval, operation) {
    const key = getGapFillKey(symbol, interval);
    const inFlight = gapFillLocks.get(key);
    if (inFlight)
        await inFlight.catch(() => { });
    const promise = operation();
    gapFillLocks.set(key, promise);
    try {
        return await promise;
    }
    finally {
        if (gapFillLocks.get(key) === promise)
            gapFillLocks.delete(key);
    }
}
