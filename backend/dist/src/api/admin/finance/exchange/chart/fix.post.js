"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/exchange/chart/utils");
exports.metadata = {
    summary: "Fix gaps in chart data for specified market and interval",
    operationId: "fixChartDataGaps",
    tags: ["Admin", "Exchange", "Chart"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbol: {
                            type: "string",
                            description: "Market symbol (e.g., 'BTC/USDT')",
                        },
                        interval: {
                            type: "string",
                            description: "Interval to fix (e.g., '1h')",
                        },
                        rateLimit: {
                            type: "number",
                            description: "Delay in milliseconds between API requests",
                            default: 500,
                        },
                        maxGaps: {
                            type: "number",
                            description: "Maximum number of gaps to fix in one request",
                            default: 10,
                        },
                        repair: {
                            type: "boolean",
                            description: "Also re-fetch and overwrite bars that are already present but discontinuous, which is what a bar captured mid-formation by an older build looks like.",
                            default: false,
                        },
                        repairFrom: {
                            type: "number",
                            description: "Only consider bars at or after this timestamp when repairing. Defaults to the whole series.",
                        },
                    },
                    required: ["symbol", "interval"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Gap fix result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            gapsFound: { type: "number" },
                            gapsFixed: { type: "number" },
                            candlesAdded: { type: "number" },
                            suspectBars: { type: "number" },
                            barsRepaired: { type: "number" },
                            errors: { type: "array", items: { type: "string" } },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "manage.exchange.chart",
    logModule: "ADMIN_FIN",
    logTitle: "Backfill chart data gaps",
};
function findGaps(candles, interval) {
    const gaps = [];
    if (candles.length < 2)
        return gaps;
    for (let i = 1; i < candles.length; i++) {
        const missing = (0, utils_1.countIntervals)(candles[i - 1][0], candles[i][0], interval) - 1;
        if (missing > 0) {
            gaps.push({ start: candles[i - 1][0], end: candles[i][0], missingCandles: missing });
        }
    }
    return gaps;
}
const SEAM_TOLERANCE = 2e-5;
function findSuspectBars(candles, interval, from) {
    const suspect = [];
    for (let i = 1; i < candles.length; i++) {
        const previous = candles[i - 1];
        const current = candles[i];
        if ((0, utils_1.advanceInterval)(previous[0], interval) !== current[0])
            continue;
        if (previous[0] < from)
            continue;
        const close = previous[4];
        const open = current[1];
        if (close <= 0)
            continue;
        if (Math.abs(open - close) / close > SEAM_TOLERANCE)
            suspect.push(previous[0]);
    }
    return suspect;
}
function toRanges(times, interval) {
    const ranges = [];
    for (const time of times) {
        const last = ranges[ranges.length - 1];
        if (last && (0, utils_1.countIntervals)(last.to, time, interval) <= 8)
            last.to = time;
        else
            ranges.push({ from: time, to: time });
    }
    return ranges;
}
exports.default = async (data) => {
    var _a, _b;
    const { body } = data;
    const { symbol, interval, rateLimit = 500, maxGaps = 10, repair = false, repairFrom = 0, } = body;
    if (!symbol || !interval) {
        throw (0, error_1.createError)({ statusCode: 400, message: "symbol and interval are required" });
    }
    if (!(0, utils_1.isValidSymbol)(symbol)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid symbol format" });
    }
    if (!(0, utils_1.isSupportedInterval)(interval)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported interval: ${interval}` });
    }
    const errors = [];
    const stored = await (0, utils_1.readSeriesFile)(symbol, interval);
    if (stored.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `No cached data found for ${symbol}:${interval}`,
        });
    }
    const candles = (0, utils_1.validateAndCleanCandles)(stored, interval);
    const lastClosed = (0, utils_1.lastClosedBoundary)(interval);
    const gaps = findGaps(candles, interval);
    const suspect = repair ? findSuspectBars(candles, interval, Number(repairFrom) || 0) : [];
    if (gaps.length === 0 && suspect.length === 0) {
        return {
            success: true,
            gapsFound: 0,
            gapsFixed: 0,
            candlesAdded: 0,
            suspectBars: 0,
            barsRepaired: 0,
            errors: [],
            message: repair
                ? "No gaps and no discontinuous bars found"
                : "No gaps found in chart data",
        };
    }
    const gapsToFix = gaps.slice(0, maxGaps);
    const before = new Map(candles.map((c) => [c[0], JSON.stringify(c)]));
    let gapsFixed = 0;
    let candlesAdded = 0;
    let barsRepaired = 0;
    try {
        const exchange = await exchange_1.default.startExchange();
        if (!exchange) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Exchange not available" });
        }
        for (const gap of gapsToFix) {
            try {
                const fetchFrom = (0, utils_1.advanceInterval)(gap.start, interval);
                const fetched = await exchange.fetchOHLCV(symbol, interval, fetchFrom, Math.min(gap.missingCandles + 1, 500));
                const valid = (0, utils_1.validateAndCleanCandles)(fetched !== null && fetched !== void 0 ? fetched : [], interval).filter((c) => c[0] > gap.start && c[0] < gap.end);
                if (valid.length > 0) {
                    await (0, utils_1.saveOHLCVToCache)(symbol, interval, valid);
                    candlesAdded += valid.length;
                }
                gapsFixed++;
                await new Promise((resolve) => setTimeout(resolve, rateLimit));
            }
            catch (err) {
                errors.push(`Gap at ${new Date(gap.start).toISOString()}: ${err.message}`);
                if (((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes("rate")) || ((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes("limit"))) {
                    await new Promise((resolve) => setTimeout(resolve, rateLimit * 5));
                }
            }
        }
        for (const range of toRanges(suspect, interval).slice(0, maxGaps)) {
            try {
                const span = (0, utils_1.countIntervals)(range.from, range.to, interval) + 2;
                const fetched = await exchange.fetchOHLCV(symbol, interval, range.from, Math.min(span, 500));
                const valid = (0, utils_1.validateAndCleanCandles)(fetched !== null && fetched !== void 0 ? fetched : [], interval).filter((c) => c[0] <= lastClosed);
                if (valid.length === 0)
                    continue;
                await (0, utils_1.saveOHLCVToCache)(symbol, interval, valid);
                for (const candle of valid) {
                    const previous = before.get(candle[0]);
                    if (previous !== undefined && previous !== JSON.stringify(candle))
                        barsRepaired++;
                }
                await new Promise((resolve) => setTimeout(resolve, rateLimit));
            }
            catch (err) {
                errors.push(`Repair at ${new Date(range.from).toISOString()}: ${err.message}`);
            }
        }
    }
    catch (err) {
        errors.push(`Exchange error: ${err.message}`);
    }
    if (barsRepaired > 0) {
        console_1.logger.info("ADMIN_FIN", `${symbol}/${interval}: rewrote ${barsRepaired} discontinuous bar(s) with the exchange's own copy`);
    }
    const response = {
        gapsFound: gaps.length,
        gapsFixed,
        candlesAdded,
        suspectBars: suspect.length,
        barsRepaired,
        remainingGaps: gaps.length - gapsFixed,
    };
    if (errors.length > 0) {
        response.errors = errors;
    }
    return response;
};
