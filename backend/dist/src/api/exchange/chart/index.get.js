"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getHistoricalOHLCV = getHistoricalOHLCV;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const utils_2 = require("../utils");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Historical Chart Data",
    operationId: "getHistoricalChartData",
    tags: ["Chart", "Historical"],
    description: "Retrieves historical chart data for the authenticated user.",
    logModule: "EXCHANGE",
    logTitle: "Get Chart Data",
    parameters: [
        {
            name: "symbol",
            in: "query",
            description: "Symbol to retrieve data for.",
            required: true,
            schema: { type: "string" },
        },
        {
            name: "interval",
            in: "query",
            description: "Interval to retrieve data for.",
            required: true,
            schema: { type: "string" },
        },
        {
            name: "from",
            in: "query",
            description: "Start timestamp to retrieve data from.",
            required: true,
            schema: { type: "number" },
        },
        {
            name: "to",
            in: "query",
            description: "End timestamp to retrieve data from.",
            required: true,
            schema: { type: "number" },
        },
        {
            name: "duration",
            in: "query",
            description: "Duration to retrieve data for.",
            required: true,
            schema: { type: "number" },
        },
    ],
    responses: {
        200: {
            description: "Historical chart data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseChartDataPointSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Chart"),
        500: query_1.serverErrorResponse,
    },
};
const CANDLES_PER_FETCH = 500;
const MAX_FETCH_REQUESTS = 12;
const FETCH_BUDGET_MS = 12000;
const FETCH_TIMEOUT_MS = 15000;
const EXCHANGE_INIT_TIMEOUT_MS = 10000;
const REQUEST_TIMEOUT_MS = 20000;
const FETCH_SPACING_MS = 100;
const MAX_FETCH_ATTEMPTS = 3;
const VERIFY_OVERLAP_BARS = 120;
const activeRequests = new Map();
const earliestKnownBar = new Map();
function withTimeout(work, ms, label) {
    let timer;
    return Promise.race([
        work,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
        }),
    ]).finally(() => clearTimeout(timer));
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    if (!query.symbol || !query.interval || !query.from || !query.to) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required parameters: symbol, interval, from, to",
        });
    }
    if (!(0, utils_1.isValidSymbol)(query.symbol)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid symbol format" });
    }
    if (!(0, utils_1.isSupportedInterval)(query.interval)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid interval" });
    }
    const rawFrom = Number(query.from);
    const rawTo = Number(query.to);
    const { from, to, isValid } = (0, utils_1.validateAndNormalizeTimestamps)(rawFrom, rawTo);
    if (!isValid) {
        console_1.logger.warn("CHART", `Unusable window for ${query.symbol}: from=${rawFrom}, to=${rawTo}; serving ${from}..${to}`);
    }
    const symbol = query.symbol;
    const interval = query.interval;
    const requestKey = `${symbol}-${interval}-${(0, utils_1.floorToInterval)(from, interval)}-${(0, utils_1.floorToInterval)(to, interval)}`;
    const inFlight = activeRequests.get(requestKey);
    if (inFlight) {
        console_1.logger.debug("CHART", `Coalescing request for ${requestKey}`);
        return await withTimeout(inFlight, REQUEST_TIMEOUT_MS, "Chart request");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching chart data for ${symbol} (${interval})`);
    const requestPromise = getHistoricalOHLCV(symbol, interval, from, to);
    activeRequests.set(requestKey, requestPromise);
    try {
        const result = await withTimeout(requestPromise, REQUEST_TIMEOUT_MS, "Chart request");
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${result.length} chart data points`);
        return result;
    }
    catch (error) {
        console_1.logger.error("CHART", `API error for ${requestKey}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        throw error;
    }
    finally {
        activeRequests.delete(requestKey);
    }
};
async function getHistoricalOHLCV(symbol, interval, from, to) {
    var _a;
    try {
        const cached = await (0, utils_1.getCachedOHLCV)(symbol, interval, from, to);
        if (await (0, utils_2.handleBanStatus)(await (0, utils_2.loadBanStatus)())) {
            console_1.logger.info("CHART", `Exchange banned; serving ${cached.length} cached bars for ${symbol}/${interval}`);
            return cached;
        }
        const gaps = pruneKnownVoids(symbol, interval, (0, utils_1.findGapsInCachedData)(cached, from, to, interval));
        if (gaps.length === 0) {
            console_1.logger.debug("CHART", `${symbol}/${interval}: cache complete, ${cached.length} bars`);
            return cached;
        }
        if ((0, utils_1.isGapFillInProgress)(symbol, interval)) {
            console_1.logger.debug("CHART", `${symbol}/${interval}: awaiting in-flight gap fill`);
            await (0, utils_1.waitForGapFill)(symbol, interval);
            return await (0, utils_1.getCachedOHLCV)(symbol, interval, from, to);
        }
        const exchange = await startExchange();
        if (!exchange) {
            console_1.logger.warn("CHART", `Exchange unavailable; serving ${cached.length} cached bars for ${symbol}/${interval}`);
            return cached;
        }
        return await (0, utils_1.executeWithGapFillLock)(symbol, interval, async () => {
            const current = await (0, utils_1.getCachedOHLCV)(symbol, interval, from, to);
            const pending = pruneKnownVoids(symbol, interval, (0, utils_1.findGapsInCachedData)(current, from, to, interval));
            if (pending.length === 0)
                return current;
            await fillGaps(exchange, symbol, interval, pending, current);
            return await (0, utils_1.getCachedOHLCV)(symbol, interval, from, to);
        });
    }
    catch (error) {
        console_1.logger.error("CHART", `Error in getHistoricalOHLCV for ${symbol}/${interval}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        try {
            return await (0, utils_1.getCachedOHLCV)(symbol, interval, from, to);
        }
        catch (_b) {
            return [];
        }
    }
}
async function startExchange() {
    var _a;
    try {
        return await withTimeout(exchange_1.default.startExchange(), EXCHANGE_INIT_TIMEOUT_MS, "Exchange initialization");
    }
    catch (error) {
        console_1.logger.warn("CHART", `Exchange init failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        return null;
    }
}
function pruneKnownVoids(symbol, interval, gaps) {
    const floor = earliestKnownBar.get(`${symbol}:${interval}`);
    if (floor === undefined)
        return gaps;
    return gaps
        .filter((gap) => gap.gapEnd > floor)
        .map((gap) => (gap.gapStart < floor ? { gapStart: floor, gapEnd: gap.gapEnd } : gap));
}
async function fillGaps(exchange, symbol, interval, gaps, cached) {
    const deadline = Date.now() + FETCH_BUDGET_MS;
    const oldestCached = cached.length > 0 ? cached[0][0] : Infinity;
    let requests = 0;
    let stored = 0;
    const ordered = [...gaps].sort((a, b) => b.gapStart - a.gapStart);
    const newest = ordered[0];
    console_1.logger.info("CHART", `${symbol}/${interval}: ${gaps.length} gap(s), ${gaps.reduce((sum, g) => sum + (0, utils_1.countIntervals)(g.gapStart, g.gapEnd, interval), 0)} bars missing; filling newest first`);
    for (const gap of ordered) {
        let cursor = gap === newest
            ? Math.max((0, utils_1.advanceInterval)(gap.gapStart, interval, -VERIFY_OVERLAP_BARS), Number.isFinite(oldestCached) ? oldestCached : gap.gapStart)
            : gap.gapStart;
        while (cursor < gap.gapEnd) {
            if (requests >= MAX_FETCH_REQUESTS || Date.now() >= deadline) {
                console_1.logger.info("CHART", `${symbol}/${interval}: fetch budget spent after ${requests} request(s), ${stored} bars stored; remaining gaps will be filled by the next request`);
                return;
            }
            if (await (0, utils_2.handleBanStatus)(await (0, utils_2.loadBanStatus)())) {
                console_1.logger.warn("CHART", `${symbol}/${interval}: exchange banned mid-fill, stopping`);
                return;
            }
            const batch = await fetchBatch(exchange, symbol, interval, cursor);
            requests++;
            if (batch === null) {
                cursor = (0, utils_1.advanceInterval)(cursor, interval, CANDLES_PER_FETCH);
                continue;
            }
            const valid = (0, utils_1.validateAndCleanCandles)(batch, interval);
            if (valid.length === 0) {
                noteVoid(symbol, interval, cursor, oldestCached, (0, utils_1.advanceInterval)(cursor, interval, CANDLES_PER_FETCH));
                cursor = (0, utils_1.advanceInterval)(cursor, interval, CANDLES_PER_FETCH);
                continue;
            }
            noteVoid(symbol, interval, cursor, oldestCached, valid[0][0]);
            await (0, utils_1.saveOHLCVToCache)(symbol, interval, valid);
            stored += valid.length;
            const last = valid[valid.length - 1][0];
            const next = (0, utils_1.advanceInterval)(last, interval);
            cursor = next > cursor ? next : (0, utils_1.advanceInterval)(cursor, interval, CANDLES_PER_FETCH);
            await sleep(FETCH_SPACING_MS);
        }
    }
    console_1.logger.info("CHART", `${symbol}/${interval}: fill complete, ${stored} bars stored in ${requests} request(s)`);
}
async function fetchBatch(exchange, symbol, interval, since) {
    var _a;
    let delay = 1000;
    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
        try {
            const rows = await withTimeout(exchange.fetchOHLCV(symbol, interval, since, CANDLES_PER_FETCH), FETCH_TIMEOUT_MS, "fetchOHLCV");
            return Array.isArray(rows) ? rows : [];
        }
        catch (error) {
            console_1.logger.warn("CHART", `${symbol}/${interval}: fetch from ${new Date(since).toISOString()} attempt ${attempt} failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
            if (attempt < MAX_FETCH_ATTEMPTS) {
                await sleep(delay);
                delay = Math.min(delay * 1.5, 5000);
            }
        }
    }
    return null;
}
function noteVoid(symbol, interval, probedFrom, oldestCached, firstAvailable) {
    if (probedFrom > oldestCached)
        return;
    if (!Number.isFinite(firstAvailable) || firstAvailable <= probedFrom)
        return;
    const key = `${symbol}:${interval}`;
    const known = earliestKnownBar.get(key);
    if (known === undefined || firstAvailable > known) {
        earliestKnownBar.set(key, firstAvailable);
        console_1.logger.debug("CHART", `${symbol}/${interval}: no history before ${new Date(firstAvailable).toISOString()}`);
    }
}
