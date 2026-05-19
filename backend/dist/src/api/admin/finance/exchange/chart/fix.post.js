"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const redis_1 = require("@b/utils/redis");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
const cacheDirPath = path_1.default.resolve(process.cwd(), "data", "chart");
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
};
function getIntervalMs(interval) {
    const map = {
        "1m": 60000,
        "3m": 180000,
        "5m": 300000,
        "15m": 900000,
        "30m": 1800000,
        "1h": 3600000,
        "2h": 7200000,
        "4h": 14400000,
        "6h": 21600000,
        "8h": 28800000,
        "12h": 43200000,
        "1d": 86400000,
        "3d": 259200000,
        "1w": 604800000,
    };
    return map[interval] || 60000;
}
function compress(data) {
    return zlib_1.default.gzipSync(JSON.stringify(data));
}
function decompress(data) {
    return JSON.parse(zlib_1.default.gunzipSync(data).toString());
}
function getCacheFilePath(symbol, interval) {
    const [currency, pair] = symbol.split("/");
    const symbolDir = path_1.default.join(cacheDirPath, currency, pair);
    return path_1.default.join(symbolDir, `${interval}.json.gz`);
}
function findGaps(candles, intervalMs) {
    const gaps = [];
    if (!Array.isArray(candles) || candles.length < 2)
        return gaps;
    for (let i = 1; i < candles.length; i++) {
        const expectedTime = candles[i - 1][0] + intervalMs;
        const actualTime = candles[i][0];
        if (actualTime > expectedTime + intervalMs) {
            gaps.push({
                start: candles[i - 1][0],
                end: actualTime,
                missingCandles: Math.floor((actualTime - expectedTime) / intervalMs),
            });
        }
    }
    return gaps;
}
exports.default = async (data) => {
    var _a, _b;
    const { body } = data;
    const { symbol, interval, rateLimit = 500, maxGaps = 10 } = body;
    if (!symbol || !interval) {
        throw (0, error_1.createError)({ statusCode: 400, message: "symbol and interval are required" });
    }
    const cacheFilePath = getCacheFilePath(symbol, interval);
    const intervalMs = getIntervalMs(interval);
    const errors = [];
    if (!fs_1.default.existsSync(cacheFilePath)) {
        throw (0, error_1.createError)({ statusCode: 404, message: `No cache file found for ${symbol}:${interval}` });
    }
    let candles;
    try {
        const compressedData = fs_1.default.readFileSync(cacheFilePath);
        candles = decompress(compressedData);
    }
    catch (err) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to read cache: ${err.message}` });
    }
    const gaps = findGaps(candles, intervalMs);
    if (gaps.length === 0) {
        return {
            success: true,
            gapsFound: 0,
            gapsFixed: 0,
            candlesAdded: 0,
            errors: [],
            message: "No gaps found in chart data",
        };
    }
    const gapsToFix = gaps.slice(0, maxGaps);
    let gapsFixed = 0;
    let candlesAdded = 0;
    try {
        const exchange = await exchange_1.default.startExchange();
        if (!exchange) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Exchange not available" });
        }
        for (const gap of gapsToFix) {
            try {
                const fetchFrom = gap.start + intervalMs;
                const fetchedCandles = await exchange.fetchOHLCV(symbol, interval, fetchFrom, gap.missingCandles + 1);
                if (fetchedCandles && fetchedCandles.length > 0) {
                    const validCandles = fetchedCandles.filter((c) => c[0] > gap.start && c[0] < gap.end);
                    if (validCandles.length > 0) {
                        candles.push(...validCandles);
                        candlesAdded += validCandles.length;
                    }
                    gapsFixed++;
                }
                await new Promise(resolve => setTimeout(resolve, rateLimit));
            }
            catch (err) {
                errors.push(`Gap at ${new Date(gap.start).toISOString()}: ${err.message}`);
                if (((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes("rate")) || ((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes("limit"))) {
                    await new Promise(resolve => setTimeout(resolve, rateLimit * 5));
                }
            }
        }
        const candleMap = new Map();
        for (const candle of candles) {
            candleMap.set(candle[0], candle);
        }
        const sortedCandles = Array.from(candleMap.values())
            .sort((a, b) => a[0] - b[0]);
        const symbolDir = path_1.default.dirname(cacheFilePath);
        if (!fs_1.default.existsSync(symbolDir)) {
            fs_1.default.mkdirSync(symbolDir, { recursive: true });
        }
        const compressed = compress(sortedCandles);
        fs_1.default.writeFileSync(cacheFilePath, compressed);
        const redisKey = `ohlcv:${symbol}:${interval}`;
        await redis.set(redisKey, JSON.stringify(sortedCandles), "EX", 86400);
    }
    catch (err) {
        errors.push(`Exchange error: ${err.message}`);
    }
    const response = {
        gapsFound: gaps.length,
        gapsFixed,
        candlesAdded,
        remainingGaps: gaps.length - gapsFixed,
    };
    if (errors.length > 0) {
        response.errors = errors;
    }
    return response;
};
