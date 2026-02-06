"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const redis_1 = require("@b/utils/redis");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
const cacheDirPath = path_1.default.resolve(process.cwd(), "data", "chart");
exports.metadata = {
    summary: "Clean chart data for specified markets and intervals",
    operationId: "cleanChartData",
    tags: ["Admin", "Exchange", "Chart"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbols: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of market symbols to clean (e.g., ['BTC/USDT', 'ETH/USDT'])",
                        },
                        intervals: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of intervals to clean (e.g., ['1m', '5m', '1h']). If empty, cleans all intervals.",
                        },
                        cleanRedis: {
                            type: "boolean",
                            description: "Also clean Redis cache",
                            default: true,
                        },
                        cleanFiles: {
                            type: "boolean",
                            description: "Also clean file cache",
                            default: true,
                        },
                    },
                    required: ["symbols"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Chart data cleaned successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            cleaned: {
                                type: "object",
                                properties: {
                                    redis: { type: "number" },
                                    files: { type: "number" },
                                },
                            },
                            errors: {
                                type: "array",
                                items: { type: "string" },
                            },
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
const ALL_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"];
exports.default = async (data) => {
    const { body } = data;
    const { symbols, intervals, cleanRedis = true, cleanFiles = true } = body;
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "symbols array is required" });
    }
    const intervalsToClean = intervals && intervals.length > 0 ? intervals : ALL_INTERVALS;
    const errors = [];
    let redisCleanedCount = 0;
    let filesCleanedCount = 0;
    for (const symbol of symbols) {
        const [currency, pair] = symbol.split("/");
        const symbolDir = path_1.default.join(cacheDirPath, currency, pair);
        for (const interval of intervalsToClean) {
            if (cleanRedis) {
                try {
                    const redisKey = `ohlcv:${symbol}:${interval}`;
                    await redis.del(redisKey);
                    redisCleanedCount++;
                }
                catch (err) {
                    errors.push(`Redis clean failed for ${symbol}:${interval}: ${err.message}`);
                }
            }
            if (cleanFiles) {
                const cacheFilePath = path_1.default.join(symbolDir, `${interval}.json.gz`);
                if (fs_1.default.existsSync(cacheFilePath)) {
                    try {
                        fs_1.default.unlinkSync(cacheFilePath);
                        filesCleanedCount++;
                    }
                    catch (err) {
                        errors.push(`File clean failed for ${symbol}:${interval}: ${err.message}`);
                    }
                }
            }
        }
        if (cleanFiles && fs_1.default.existsSync(symbolDir)) {
            try {
                const remainingFiles = fs_1.default.readdirSync(symbolDir);
                if (remainingFiles.length === 0) {
                    fs_1.default.rmdirSync(symbolDir);
                }
            }
            catch (err) {
            }
        }
    }
    const response = {
        cleaned: {
            redis: redisCleanedCount,
            files: filesCleanedCount,
        },
    };
    if (errors.length > 0) {
        response.errors = errors;
    }
    return response;
};
