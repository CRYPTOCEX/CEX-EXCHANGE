"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/exchange/chart/utils");
const gunzip = (0, util_1.promisify)(zlib_1.default.gunzip);
const cacheDirPath = path_1.default.resolve(process.cwd(), "data", "chart");
exports.metadata = {
    summary: "Get chart data statistics for all markets",
    operationId: "getChartStatistics",
    tags: ["Admin", "Exchange", "Chart"],
    responses: {
        200: {
            description: "Chart statistics for all markets",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            markets: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        symbol: { type: "string" },
                                        currency: { type: "string" },
                                        pair: { type: "string" },
                                        status: { type: "boolean" },
                                        intervals: {
                                            type: "object",
                                            additionalProperties: {
                                                type: "object",
                                                properties: {
                                                    candleCount: { type: "number" },
                                                    fileSize: { type: "number" },
                                                    oldestCandle: { type: "number" },
                                                    newestCandle: { type: "number" },
                                                    gaps: { type: "number" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            totalMarkets: { type: "number" },
                            totalCacheSize: { type: "number" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.exchange.chart",
};
const INTERVALS = utils_1.SUPPORTED_INTERVALS;
async function decompressAsync(data) {
    const decompressed = await gunzip(data);
    return JSON.parse(decompressed.toString());
}
function countGaps(candles, interval) {
    if (!Array.isArray(candles) || candles.length < 2)
        return 0;
    let gaps = 0;
    for (let i = 1; i < candles.length; i++) {
        if ((0, utils_1.countIntervals)(candles[i - 1][0], candles[i][0], interval) > 1)
            gaps++;
    }
    return gaps;
}
async function fileExists(filePath) {
    try {
        await fs_1.promises.access(filePath);
        return true;
    }
    catch (_a) {
        return false;
    }
}
async function processInterval(symbolDir, interval) {
    const cacheFilePath = path_1.default.join(symbolDir, `${interval}.json.gz`);
    if (!(await fileExists(cacheFilePath))) {
        return { interval, data: null, size: 0 };
    }
    try {
        const [stats, compressedData] = await Promise.all([
            fs_1.promises.stat(cacheFilePath),
            fs_1.promises.readFile(cacheFilePath),
        ]);
        const candles = await decompressAsync(compressedData);
        if (Array.isArray(candles) && candles.length > 0) {
            return {
                interval,
                data: {
                    candleCount: candles.length,
                    fileSize: stats.size,
                    oldestCandle: candles[0][0],
                    newestCandle: candles[candles.length - 1][0],
                    gaps: countGaps(candles, interval),
                },
                size: stats.size,
            };
        }
        return { interval, data: null, size: 0 };
    }
    catch (err) {
        return {
            interval,
            data: {
                candleCount: 0,
                fileSize: 0,
                oldestCandle: null,
                newestCandle: null,
                gaps: 0,
                error: "Failed to read cache file",
            },
            size: 0,
        };
    }
}
async function processMarket(market) {
    const symbol = `${market.currency}/${market.pair}`;
    const symbolDir = path_1.default.join(cacheDirPath, market.currency, market.pair);
    const intervalResults = await Promise.all(INTERVALS.map(interval => processInterval(symbolDir, interval)));
    const intervals = {};
    let cacheSize = 0;
    for (const result of intervalResults) {
        if (result.data) {
            intervals[result.interval] = result.data;
            cacheSize += result.size;
        }
    }
    return {
        marketStat: {
            id: market.id,
            symbol,
            currency: market.currency,
            pair: market.pair,
            status: market.status,
            intervals,
        },
        cacheSize,
    };
}
exports.default = async (data) => {
    try {
        const markets = await db_1.models.exchangeMarket.findAll({
            where: { status: true },
            attributes: ["id", "currency", "pair", "status"],
            raw: true,
        });
        const results = await Promise.all(markets.map(processMarket));
        const marketStats = results.map(r => r.marketStat);
        const totalCacheSize = results.reduce((sum, r) => sum + r.cacheSize, 0);
        return {
            markets: marketStats,
            totalMarkets: markets.length,
            totalCacheSize,
            intervals: INTERVALS,
        };
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get chart statistics: ${error.message}` });
    }
};
