"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/exchange/chart/utils");
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
    logModule: "ADMIN_FIN",
    logTitle: "Delete chart data",
};
const ALL_INTERVALS = utils_1.SUPPORTED_INTERVALS;
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
        if (!(0, utils_1.isValidSymbol)(symbol)) {
            errors.push(`Invalid symbol format: ${symbol}`);
            continue;
        }
        for (const interval of intervalsToClean) {
            if (!(0, utils_1.isSupportedInterval)(interval)) {
                errors.push(`Unsupported interval: ${interval}`);
                continue;
            }
            try {
                const dropped = await (0, utils_1.dropSeries)(symbol, interval, {
                    file: cleanFiles,
                    redis: cleanRedis,
                });
                if (dropped.redis)
                    redisCleanedCount++;
                if (dropped.file)
                    filesCleanedCount++;
            }
            catch (err) {
                errors.push(`Clean failed for ${symbol}:${interval}: ${err.message}`);
            }
        }
        if (cleanFiles) {
            const symbolDir = path_1.default.dirname((0, utils_1.getCacheFilePath)(symbol, ALL_INTERVALS[0]));
            try {
                if (fs_1.default.existsSync(symbolDir) && fs_1.default.readdirSync(symbolDir).length === 0) {
                    fs_1.default.rmdirSync(symbolDir);
                }
            }
            catch (_a) {
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
