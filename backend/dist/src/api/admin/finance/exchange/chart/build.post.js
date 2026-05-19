"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const Websocket_1 = require("@b/handler/Websocket");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
const cacheDirPath = path_1.default.resolve(process.cwd(), "data", "chart");
exports.metadata = {
    summary: "Build/rebuild chart data for specified markets",
    operationId: "buildChartData",
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
                            description: "Array of market symbols to build (e.g., ['BTC/USDT']). If empty, builds all enabled markets.",
                        },
                        intervals: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of intervals to build (e.g., ['1h', '4h', '1d']). If empty, builds common intervals.",
                        },
                        days: {
                            type: "number",
                            description: "Number of days of historical data to fetch",
                            default: 30,
                        },
                        rateLimit: {
                            type: "number",
                            description: "Delay in milliseconds between API requests",
                            default: 500,
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Chart data build started",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            jobId: { type: "string" },
                            markets: { type: "number" },
                            intervals: { type: "number" },
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
const DEFAULT_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d"];
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
    if (!fs_1.default.existsSync(symbolDir)) {
        fs_1.default.mkdirSync(symbolDir, { recursive: true });
    }
    return path_1.default.join(symbolDir, `${interval}.json.gz`);
}
const activeBuilds = new Map();
function broadcastProgress(jobId, data) {
    try {
        Websocket_1.messageBroker.broadcastToSubscribedClients("/api/admin/finance/exchange/chart/build", { jobId }, { type: "progress", jobId, data });
    }
    catch (err) {
    }
}
exports.default = async (data) => {
    const { body } = data;
    const { symbols, intervals, days = 30, rateLimit = 500 } = body;
    let marketsToProcess = [];
    if (symbols && symbols.length > 0) {
        marketsToProcess = symbols.map((s) => {
            const [currency, pair] = s.split("/");
            return { currency, pair };
        });
    }
    else {
        const markets = await db_1.models.exchangeMarket.findAll({
            where: { status: true },
            attributes: ["currency", "pair"],
            raw: true,
        });
        marketsToProcess = markets;
    }
    const intervalsToProcess = intervals && intervals.length > 0 ? intervals : DEFAULT_INTERVALS;
    const jobId = `build_${Date.now()}`;
    activeBuilds.set(jobId, {
        status: "running",
        progress: 0,
        errors: [],
    });
    await redis.set(`chart_build_job:${jobId}`, JSON.stringify({
        status: "running",
        startTime: Date.now(),
        totalMarkets: marketsToProcess.length,
        totalIntervals: intervalsToProcess.length,
        completedMarkets: 0,
        errors: [],
    }), "EX", 3600);
    console_1.logger.info("Chart Build", `Starting job ${jobId} for ${marketsToProcess.length} markets, ${intervalsToProcess.length} intervals`);
    buildChartDataAsync(jobId, marketsToProcess, intervalsToProcess, days, rateLimit).catch((err) => {
        console_1.logger.error("Chart Build", `Job ${jobId} failed with error: ${err.message}`);
    });
    return {
        message: "Chart data build started in background",
        jobId,
        markets: marketsToProcess.length,
        intervals: intervalsToProcess.length,
        estimatedTime: `${Math.ceil((marketsToProcess.length * intervalsToProcess.length * rateLimit) / 60000)} minutes`,
    };
};
async function buildChartDataAsync(jobId, markets, intervals, days, rateLimit) {
    var _a, _b;
    const errors = [];
    let completedMarkets = 0;
    console_1.logger.info("Chart Build", `Job ${jobId} - Starting async build process`);
    try {
        console_1.logger.info("Chart Build", `Job ${jobId} - Initializing exchange...`);
        const exchange = await exchange_1.default.startExchange();
        if (!exchange) {
            console_1.logger.error("Chart Build", `Job ${jobId} - Exchange not available`);
            throw (0, error_1.createError)({ statusCode: 503, message: "Exchange not available" });
        }
        console_1.logger.info("Chart Build", `Job ${jobId} - Exchange initialized: ${exchange.name || exchange.id || 'unknown'}`);
        const now = Date.now();
        const totalTasks = markets.length * intervals.length;
        let completedTasks = 0;
        console_1.logger.info("Chart Build", `Job ${jobId} - Total tasks: ${totalTasks} (${markets.length} markets x ${intervals.length} intervals)`);
        for (const market of markets) {
            const symbol = `${market.currency}/${market.pair}`;
            console_1.logger.info("Chart Build", `Job ${jobId} - Processing market: ${symbol}`);
            for (const interval of intervals) {
                try {
                    const intervalMs = getIntervalMs(interval);
                    const from = now - (days * 24 * 60 * 60 * 1000);
                    let existingCandles = [];
                    const cacheFilePath = getCacheFilePath(symbol, interval);
                    if (fs_1.default.existsSync(cacheFilePath)) {
                        try {
                            const compressedData = fs_1.default.readFileSync(cacheFilePath);
                            existingCandles = decompress(compressedData);
                        }
                        catch (e) {
                        }
                    }
                    const batchSize = 500;
                    let fetchFrom = from;
                    const allCandles = [...existingCandles];
                    if (existingCandles.length > 0) {
                        const newestExisting = existingCandles[existingCandles.length - 1][0];
                        if (newestExisting > from) {
                            fetchFrom = newestExisting + intervalMs;
                        }
                    }
                    let batchCount = 0;
                    while (fetchFrom < now) {
                        try {
                            batchCount++;
                            const candles = await exchange.fetchOHLCV(symbol, interval, fetchFrom, batchSize);
                            if (!candles || candles.length === 0) {
                                break;
                            }
                            allCandles.push(...candles);
                            fetchFrom = candles[candles.length - 1][0] + intervalMs;
                            await new Promise(resolve => setTimeout(resolve, rateLimit));
                        }
                        catch (fetchError) {
                            if (((_a = fetchError.message) === null || _a === void 0 ? void 0 : _a.includes("rate")) || ((_b = fetchError.message) === null || _b === void 0 ? void 0 : _b.includes("limit"))) {
                                console_1.logger.warn("Chart Build", `Job ${jobId} - Rate limited for ${symbol}:${interval}, waiting...`);
                                await new Promise(resolve => setTimeout(resolve, rateLimit * 5));
                            }
                            else {
                                throw fetchError;
                            }
                        }
                    }
                    const candleMap = new Map();
                    for (const candle of allCandles) {
                        candleMap.set(candle[0], candle);
                    }
                    const sortedCandles = Array.from(candleMap.values())
                        .sort((a, b) => a[0] - b[0]);
                    const compressed = compress(sortedCandles);
                    fs_1.default.writeFileSync(cacheFilePath, compressed);
                    const redisKey = `ohlcv:${symbol}:${interval}`;
                    await redis.set(redisKey, JSON.stringify(sortedCandles), "EX", 86400);
                    completedTasks++;
                    console_1.logger.info("Chart Build", `Job ${jobId} - Completed ${symbol}:${interval} (${completedTasks}/${totalTasks})`);
                }
                catch (err) {
                    console_1.logger.error("Chart Build", `Job ${jobId} - Error for ${symbol}:${interval}: ${err.message}`);
                    errors.push(`${symbol}:${interval} - ${err.message}`);
                }
                const progress = Math.round((completedTasks / totalTasks) * 100);
                const progressData = {
                    status: "running",
                    progress,
                    completedTasks,
                    totalTasks,
                    errors,
                    currentSymbol: symbol,
                    currentInterval: interval,
                };
                await redis.set(`chart_build_job:${jobId}`, JSON.stringify(progressData), "EX", 3600);
                broadcastProgress(jobId, progressData);
            }
            completedMarkets++;
        }
        console_1.logger.info("Chart Build", `Job ${jobId} - Build completed successfully`);
        const completedData = {
            status: "completed",
            progress: 100,
            completedMarkets,
            totalMarkets: markets.length,
            errors,
            completedAt: Date.now(),
        };
        await redis.set(`chart_build_job:${jobId}`, JSON.stringify(completedData), "EX", 3600);
        broadcastProgress(jobId, completedData);
    }
    catch (error) {
        console_1.logger.error("Chart Build", `Job ${jobId} - Build failed: ${error.message}`);
        const failedData = {
            status: "failed",
            error: error.message,
            errors,
            failedAt: Date.now(),
        };
        await redis.set(`chart_build_job:${jobId}`, JSON.stringify(failedData), "EX", 3600);
        broadcastProgress(jobId, failedData);
    }
    finally {
        activeBuilds.delete(jobId);
    }
}
