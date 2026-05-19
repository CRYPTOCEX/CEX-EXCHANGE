"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAiMarketMakerEngine = processAiMarketMakerEngine;
exports.processAiRiskMonitor = processAiRiskMonitor;
exports.processAiPoolRebalancer = processAiPoolRebalancer;
exports.processAiDailyReset = processAiDailyReset;
exports.processAiAnalyticsAggregator = processAiAnalyticsAggregator;
exports.processAiPriceSync = processAiPriceSync;
exports.getCachedExternalPrice = getCachedExternalPrice;
exports.forceRefreshPrice = forceRefreshPrice;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("@b/cron/broadcast");
const cache_1 = require("@b/utils/cache");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const MarketMakerEngine_1 = __importDefault(require("./engine/MarketMakerEngine"));
let engineInitialized = false;
let cronInProgress = false;
let lastExecutionTime = 0;
const MIN_EXECUTION_INTERVAL_MS = 4000;
async function processAiMarketMakerEngine() {
    const cronName = "processAiMarketMakerEngine";
    const startTime = Date.now();
    if (cronInProgress) {
        (0, broadcast_1.broadcastLog)(cronName, "Previous execution still in progress, skipping", "info");
        return;
    }
    if (startTime - lastExecutionTime < MIN_EXECUTION_INTERVAL_MS) {
        return;
    }
    cronInProgress = true;
    lastExecutionTime = startTime;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        const settings = await getGlobalSettings();
        if (!settings.tradingEnabled) {
            if (engineInitialized && MarketMakerEngine_1.default.getStatus().status === "RUNNING") {
                (0, broadcast_1.broadcastLog)(cronName, "AI Market Maker disabled, shutting down engine", "warning");
                await MarketMakerEngine_1.default.shutdown();
                engineInitialized = false;
            }
            (0, broadcast_1.broadcastLog)(cronName, "AI Market Maker is disabled globally", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        if (settings.maintenanceMode) {
            if (engineInitialized && MarketMakerEngine_1.default.getStatus().status === "RUNNING") {
                (0, broadcast_1.broadcastLog)(cronName, "Maintenance mode, shutting down engine", "warning");
                await MarketMakerEngine_1.default.shutdown();
                engineInitialized = false;
            }
            (0, broadcast_1.broadcastLog)(cronName, "AI Market Maker is in maintenance mode", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        if (settings.globalPauseEnabled) {
            (0, broadcast_1.broadcastLog)(cronName, "AI Market Maker is globally paused", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const engineStatus = MarketMakerEngine_1.default.getStatus();
        if (!engineInitialized || engineStatus.status === "STOPPED") {
            (0, broadcast_1.broadcastLog)(cronName, "Initializing AI Market Maker Engine...", "info");
            try {
                await MarketMakerEngine_1.default.initialize({
                    tickIntervalMs: 1000,
                    maxConcurrentMarkets: settings.maxConcurrentBots || 50,
                    enableRealLiquidity: true,
                    emergencyStopEnabled: true,
                });
                engineInitialized = true;
                (0, broadcast_1.broadcastLog)(cronName, "AI Market Maker Engine initialized successfully", "success");
            }
            catch (initError) {
                console_1.logger.error("AI_MARKET_MAKER", "Failed to initialize engine", initError);
                (0, broadcast_1.broadcastLog)(cronName, `Failed to initialize engine: ${initError.message}`, "error");
                (0, broadcast_1.broadcastStatus)(cronName, "failed");
                return;
            }
        }
        const status = MarketMakerEngine_1.default.getStatus();
        (0, broadcast_1.broadcastLog)(cronName, `Engine running: ${status.activeMarkets} markets, ${status.tickCount} ticks, ${status.errorCount} errors`, "info");
        await syncMarketStatuses(MarketMakerEngine_1.default);
        (0, broadcast_1.broadcastProgress)(cronName, 100);
        (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
    }
    catch (error) {
        console_1.logger.error("AI_MARKET_MAKER", "AI Market Maker Engine failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `AI Market Maker Engine failed: ${error.message}`, "error");
    }
    finally {
        cronInProgress = false;
    }
}
async function syncMarketStatuses(engine) {
    var _a, _b;
    const cronName = "processAiMarketMakerEngine";
    const marketManager = engine.getMarketManager();
    if (!marketManager)
        return;
    try {
        const marketMakers = await db_1.models.aiMarketMaker.findAll({
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                { model: db_1.models.ecosystemMarket, as: "market" },
                { model: db_1.models.aiBot, as: "bots" },
            ],
        });
        for (const maker of marketMakers) {
            const makerAny = maker;
            const isRunningInEngine = marketManager.isMarketActive(makerAny.id);
            if (makerAny.status === "ACTIVE" && !isRunningInEngine) {
                (0, broadcast_1.broadcastLog)(cronName, `Starting market ${((_a = makerAny.market) === null || _a === void 0 ? void 0 : _a.symbol) || makerAny.id}`, "info");
                await marketManager.startMarket(makerAny);
            }
            else if (makerAny.status === "STOPPED" && isRunningInEngine) {
                (0, broadcast_1.broadcastLog)(cronName, `Stopping market ${((_b = makerAny.market) === null || _b === void 0 ? void 0 : _b.symbol) || makerAny.id}`, "info");
                await marketManager.stopMarket(makerAny.id);
            }
        }
    }
    catch (error) {
        console_1.logger.error("AI_MARKET_MAKER", "Failed to sync market statuses", error);
        (0, broadcast_1.broadcastLog)(cronName, `Failed to sync market statuses: ${error.message}`, "error");
    }
}
async function getGlobalSettings() {
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const [tradingEnabled, globalPauseEnabled, maintenanceMode, maxConcurrentBots] = await Promise.all([
            cacheManager.getSetting("aiMarketMakerEnabled"),
            cacheManager.getSetting("aiMarketMakerGlobalPauseEnabled"),
            cacheManager.getSetting("aiMarketMakerMaintenanceMode"),
            cacheManager.getSetting("aiMarketMakerMaxConcurrentBots"),
        ]);
        return {
            tradingEnabled: tradingEnabled !== false,
            globalPauseEnabled: globalPauseEnabled === true,
            maintenanceMode: maintenanceMode === true,
            maxConcurrentBots: maxConcurrentBots || 50,
        };
    }
    catch (error) {
        console_1.logger.error("AI_SETTINGS", "Failed to get global settings", error);
        return {
            tradingEnabled: true,
            globalPauseEnabled: false,
            maintenanceMode: false,
            maxConcurrentBots: 50,
        };
    }
}
async function processAiRiskMonitor() {
    const cronName = "processAiRiskMonitor";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting AI Risk Monitor check");
        const settings = await getAiMarketMakerSettings();
        if (!settings.tradingEnabled) {
            (0, broadcast_1.broadcastLog)(cronName, "AI Market Maker disabled, skipping risk check", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const activeMarkets = await db_1.models.aiMarketMaker.findAll({
            where: { status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] } },
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                { model: db_1.models.ecosystemMarket, as: "market" },
            ],
        });
        const total = activeMarkets.length;
        if (total === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No active markets to monitor", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Monitoring ${total} markets for risk`);
        const alerts = [];
        for (let i = 0; i < total; i++) {
            const market = activeMarkets[i];
            try {
                const marketAlerts = await checkMarketRisk(market, settings);
                alerts.push(...marketAlerts);
            }
            catch (error) {
                console_1.logger.error("AI_RISK_MONITOR", `Failed to check risk for market ${market.id}`, error);
            }
            const progress = Math.round(((i + 1) / total) * 100);
            (0, broadcast_1.broadcastProgress)(cronName, progress);
        }
        if (alerts.length > 0) {
            (0, broadcast_1.broadcastLog)(cronName, `Risk alerts found: ${alerts.length}`, "warning");
            for (const alert of alerts) {
                (0, broadcast_1.broadcastLog)(cronName, alert, "warning");
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
        (0, broadcast_1.broadcastLog)(cronName, `AI Risk Monitor completed in ${Date.now() - startTime}ms`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_RISK_MONITOR", "AI Risk Monitor failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `AI Risk Monitor failed: ${error.message}`, "error");
        throw error;
    }
}
async function checkMarketRisk(market, settings) {
    var _a;
    const alerts = [];
    const pool = market.pool;
    const symbol = ((_a = market.market) === null || _a === void 0 ? void 0 : _a.symbol) || market.id;
    if (market.volatilityPauseEnabled) {
        const volatility = await calculateVolatility(market.id);
        const threshold = market.volatilityThreshold || settings.defaultVolatilityThreshold;
        if (volatility > threshold) {
            alerts.push(`High volatility detected for ${symbol}: ${volatility.toFixed(2)}% (threshold: ${threshold}%)`);
            if (market.status === "ACTIVE") {
                await pauseMarketForVolatility(market);
                alerts.push(`Market ${symbol} auto-paused due to high volatility`);
            }
        }
    }
    if (pool) {
        const dailyPnL = await calculateDailyPnL(market.id);
        const tvl = Number(pool.totalValueLocked) || 1;
        const lossPercent = (dailyPnL / tvl) * -100;
        if (lossPercent > settings.maxDailyLossPercent) {
            alerts.push(`Daily loss limit exceeded for ${symbol}: ${lossPercent.toFixed(2)}%`);
            if (market.status === "ACTIVE") {
                await pauseMarketForLoss(market, lossPercent);
                alerts.push(`Market ${symbol} auto-paused due to daily loss limit`);
            }
        }
    }
    if (market.status === "ACTIVE") {
        const lastTradeTime = await getLastTradeTime(market.id);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (lastTradeTime && lastTradeTime < hourAgo) {
            alerts.push(`Market ${symbol} has been inactive for over an hour`);
        }
    }
    if (pool) {
        const baseValue = Number(pool.baseCurrencyBalance) * Number(market.targetPrice);
        const quoteValue = Number(pool.quoteCurrencyBalance);
        const tvl = baseValue + quoteValue;
        if (tvl > 0) {
            const baseRatio = baseValue / tvl;
            if (baseRatio < 0.1 || baseRatio > 0.9) {
                alerts.push(`Pool imbalance detected for ${symbol}: Base ${(baseRatio * 100).toFixed(1)}%`);
            }
        }
    }
    if (pool && Number(pool.totalValueLocked) < settings.minLiquidity) {
        alerts.push(`Low liquidity warning for ${symbol}: ${Number(pool.totalValueLocked).toFixed(2)}`);
    }
    return alerts;
}
async function calculateVolatility(marketMakerId) {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentHistory = await db_1.models.aiMarketMakerHistory.findAll({
            where: {
                marketMakerId,
                action: { [sequelize_1.Op.in]: ["TRADE", "TARGET_CHANGE"] },
                createdAt: { [sequelize_1.Op.gte]: oneHourAgo },
            },
            order: [["createdAt", "ASC"]],
        });
        if (recentHistory.length < 2)
            return 0;
        const prices = recentHistory.map((h) => Number(h.priceAtAction));
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        if (returns.length === 0)
            return 0;
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(365 * 24) * 100;
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to calculate volatility", error);
        return 0;
    }
}
async function calculateDailyPnL(marketMakerId) {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const trades = await db_1.models.aiMarketMakerHistory.findAll({
            where: {
                marketMakerId,
                action: "TRADE",
                createdAt: { [sequelize_1.Op.gte]: startOfDay },
            },
        });
        return trades.reduce((sum, t) => { var _a; return sum + (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0); }, 0);
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to calculate daily PnL", error);
        return 0;
    }
}
async function getLastTradeTime(marketMakerId) {
    try {
        const lastTrade = await db_1.models.aiMarketMakerHistory.findOne({
            where: { marketMakerId, action: "TRADE" },
            order: [["createdAt", "DESC"]],
        });
        return lastTrade ? lastTrade.createdAt : null;
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to get last trade time", error);
        return null;
    }
}
async function pauseMarketForVolatility(market) {
    var _a;
    try {
        await db_1.models.aiMarketMaker.update({ status: "PAUSED" }, { where: { id: market.id } });
        await db_1.models.aiBot.update({ status: "PAUSED" }, { where: { marketMakerId: market.id, status: "ACTIVE" } });
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: market.id,
            action: "AUTO_PAUSE",
            details: { reason: "HIGH_VOLATILITY", note: "Market automatically paused due to high volatility" },
            priceAtAction: market.targetPrice,
            poolValueAtAction: Number(((_a = market.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) || 0),
        });
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to pause market for volatility", error);
    }
}
async function pauseMarketForLoss(market, lossPercent) {
    var _a;
    try {
        await db_1.models.aiMarketMaker.update({ status: "PAUSED" }, { where: { id: market.id } });
        await db_1.models.aiBot.update({ status: "PAUSED" }, { where: { marketMakerId: market.id, status: "ACTIVE" } });
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: market.id,
            action: "AUTO_PAUSE",
            details: { reason: "DAILY_LOSS_LIMIT", note: `Market paused due to daily loss limit (${lossPercent.toFixed(2)}%)` },
            priceAtAction: market.targetPrice,
            poolValueAtAction: Number(((_a = market.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) || 0),
        });
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to pause market for loss", error);
    }
}
async function getAiMarketMakerSettings() {
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const [tradingEnabled, maxDailyLossPercent, defaultVolatilityThreshold, minLiquidity, stopLossEnabled] = await Promise.all([
            cacheManager.getSetting("aiMarketMakerEnabled"),
            cacheManager.getSetting("aiMarketMakerMaxDailyLossPercent"),
            cacheManager.getSetting("aiMarketMakerDefaultVolatilityThreshold"),
            cacheManager.getSetting("aiMarketMakerMinLiquidity"),
            cacheManager.getSetting("aiMarketMakerStopLossEnabled"),
        ]);
        return {
            tradingEnabled: tradingEnabled !== false,
            maxDailyLossPercent: maxDailyLossPercent || 5,
            defaultVolatilityThreshold: defaultVolatilityThreshold || 10,
            minLiquidity: minLiquidity || 100,
            stopLossEnabled: stopLossEnabled !== false,
        };
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to get AI market maker settings", error);
        return { tradingEnabled: true, maxDailyLossPercent: 5, defaultVolatilityThreshold: 10, minLiquidity: 100, stopLossEnabled: true };
    }
}
const MIN_RATIO_THRESHOLD = 0.2;
const MAX_RATIO_THRESHOLD = 0.8;
const TARGET_RATIO = 0.5;
async function processAiPoolRebalancer() {
    const cronName = "processAiPoolRebalancer";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting AI Pool Rebalancer");
        const cacheManager = cache_1.CacheManager.getInstance();
        const tradingEnabled = await cacheManager.getSetting("aiMarketMakerEnabled");
        const isEnabled = tradingEnabled === true || tradingEnabled === "true";
        if (!isEnabled) {
            (0, broadcast_1.broadcastLog)(cronName, "AI Market Maker disabled, skipping rebalance", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const marketsWithPools = await db_1.models.aiMarketMaker.findAll({
            where: { status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] } },
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                { model: db_1.models.ecosystemMarket, as: "market" },
            ],
        });
        const total = marketsWithPools.length;
        if (total === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No markets with pools to check", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Checking ${total} pools for rebalancing`);
        let rebalancedCount = 0;
        for (let i = 0; i < total; i++) {
            const market = marketsWithPools[i];
            const pool = market.pool;
            if (!pool)
                continue;
            try {
                if (checkPoolNeedsRebalance(market, pool)) {
                    await rebalancePool(market, pool);
                    rebalancedCount++;
                }
            }
            catch (error) {
                console_1.logger.error("AI_REBALANCER", `Failed to rebalance pool ${pool.id}`, error);
            }
            (0, broadcast_1.broadcastProgress)(cronName, Math.round(((i + 1) / total) * 100));
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
        (0, broadcast_1.broadcastLog)(cronName, `AI Pool Rebalancer completed. Rebalanced ${rebalancedCount} pools`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_REBALANCER", "AI Pool Rebalancer failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        throw error;
    }
}
function checkPoolNeedsRebalance(market, pool) {
    const baseCurrencyBalance = Number(pool.baseCurrencyBalance) || 0;
    const quoteCurrencyBalance = Number(pool.quoteCurrencyBalance) || 0;
    const targetPrice = Number(market.targetPrice) || 1;
    const baseValue = baseCurrencyBalance * targetPrice;
    const quoteValue = quoteCurrencyBalance;
    const totalValue = baseValue + quoteValue;
    if (totalValue <= 0)
        return false;
    const baseRatio = baseValue / totalValue;
    return baseRatio < MIN_RATIO_THRESHOLD || baseRatio > MAX_RATIO_THRESHOLD;
}
async function rebalancePool(market, pool) {
    var _a;
    const cronName = "processAiPoolRebalancer";
    const symbol = ((_a = market.market) === null || _a === void 0 ? void 0 : _a.symbol) || market.id;
    const baseCurrencyBalance = Number(pool.baseCurrencyBalance) || 0;
    const quoteCurrencyBalance = Number(pool.quoteCurrencyBalance) || 0;
    const targetPrice = Number(market.targetPrice) || 1;
    const baseValue = baseCurrencyBalance * targetPrice;
    const quoteValue = quoteCurrencyBalance;
    const totalValue = baseValue + quoteValue;
    if (totalValue <= 0)
        return;
    const currentBaseRatio = baseValue / totalValue;
    const targetBaseValue = totalValue * TARGET_RATIO;
    const targetQuoteValue = totalValue * (1 - TARGET_RATIO);
    const targetBaseCurrencyBalance = targetBaseValue / targetPrice;
    const targetQuoteCurrencyBalance = targetQuoteValue;
    (0, broadcast_1.broadcastLog)(cronName, `Rebalancing ${symbol}: Base ${(currentBaseRatio * 100).toFixed(1)}% -> ${(TARGET_RATIO * 100).toFixed(1)}%`);
    await db_1.models.aiMarketMakerPool.update({ baseCurrencyBalance: targetBaseCurrencyBalance, quoteCurrencyBalance: targetQuoteCurrencyBalance, lastRebalanceAt: new Date() }, { where: { id: pool.id } });
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: market.id,
        action: "CONFIG_CHANGE",
        details: {
            field: "poolRebalance",
            previousValue: { baseCurrencyBalance, quoteCurrencyBalance, baseRatio: currentBaseRatio },
            newValue: { baseCurrencyBalance: targetBaseCurrencyBalance, quoteCurrencyBalance: targetQuoteCurrencyBalance, baseRatio: TARGET_RATIO },
            note: "AUTO_REBALANCE",
        },
        priceAtAction: targetPrice,
        poolValueAtAction: totalValue,
    });
    (0, broadcast_1.broadcastLog)(cronName, `Pool ${symbol} rebalanced`, "success");
}
async function processAiDailyReset() {
    const cronName = "processAiDailyReset";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting AI Daily Reset");
        (0, broadcast_1.broadcastLog)(cronName, "Generating daily summaries...");
        await generateDailySummaries();
        (0, broadcast_1.broadcastProgress)(cronName, 25);
        (0, broadcast_1.broadcastLog)(cronName, "Resetting market daily volumes...");
        await resetMarketDailyVolumes();
        (0, broadcast_1.broadcastProgress)(cronName, 50);
        (0, broadcast_1.broadcastLog)(cronName, "Resetting bot daily trade counts...");
        await resetBotDailyTradeCounts();
        (0, broadcast_1.broadcastProgress)(cronName, 75);
        (0, broadcast_1.broadcastLog)(cronName, "Checking for markets to resume...");
        await resumeAutoPausedMarkets();
        (0, broadcast_1.broadcastProgress)(cronName, 100);
        (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
        (0, broadcast_1.broadcastLog)(cronName, `AI Daily Reset completed in ${Date.now() - startTime}ms`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_DAILY_RESET", "AI Daily Reset failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        throw error;
    }
}
async function generateDailySummaries() {
    var _a;
    const markets = await db_1.models.aiMarketMaker.findAll({
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            { model: db_1.models.ecosystemMarket, as: "market" },
        ],
    });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const market of markets) {
        try {
            const trades = await db_1.models.aiMarketMakerHistory.findAll({
                where: {
                    marketMakerId: market.id,
                    action: "TRADE",
                    createdAt: { [sequelize_1.Op.gte]: yesterday, [sequelize_1.Op.lt]: today },
                },
            });
            let totalVolume = 0, totalPnL = 0, buyCount = 0, sellCount = 0;
            for (const trade of trades) {
                const details = trade.details || {};
                totalVolume += details.value || 0;
                totalPnL += details.pnl || 0;
                if (details.side === "BUY")
                    buyCount++;
                if (details.side === "SELL")
                    sellCount++;
            }
            await db_1.models.aiMarketMakerHistory.create({
                marketMakerId: market.id,
                action: "CONFIG_CHANGE",
                details: {
                    field: "DAILY_SUMMARY",
                    previousValue: null,
                    newValue: {
                        date: yesterday.toISOString().split("T")[0],
                        totalTrades: trades.length,
                        buyTrades: buyCount,
                        sellTrades: sellCount,
                        totalVolume,
                        totalPnL,
                    },
                },
                priceAtAction: market.targetPrice,
                poolValueAtAction: Number(((_a = market.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) || 0),
            });
        }
        catch (error) {
            console_1.logger.error("AI_SUMMARY", `Failed to generate daily summary for market ${market.id}`, error);
        }
    }
}
async function resetMarketDailyVolumes() {
    await db_1.models.aiMarketMaker.update({ currentDailyVolume: 0 }, { where: {} });
}
async function resetBotDailyTradeCounts() {
    await db_1.models.aiBot.update({ dailyTradeCount: 0 }, { where: {} });
}
async function resumeAutoPausedMarkets() {
    var _a;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const autoPausedHistory = await db_1.models.aiMarketMakerHistory.findAll({
        where: { action: "AUTO_PAUSE", createdAt: { [sequelize_1.Op.gte]: yesterday } },
        attributes: ["marketMakerId"],
        group: ["marketMakerId"],
    });
    const marketIds = autoPausedHistory.map((h) => h.marketMakerId);
    if (marketIds.length === 0)
        return;
    const pausedMarkets = await db_1.models.aiMarketMaker.findAll({
        where: { id: { [sequelize_1.Op.in]: marketIds }, status: "PAUSED" },
    });
    for (const market of pausedMarkets) {
        try {
            const lastPause = await db_1.models.aiMarketMakerHistory.findOne({
                where: { marketMakerId: market.id, action: "AUTO_PAUSE" },
                order: [["createdAt", "DESC"]],
            });
            if (((_a = lastPause === null || lastPause === void 0 ? void 0 : lastPause.details) === null || _a === void 0 ? void 0 : _a.reason) === "DAILY_LOSS_LIMIT") {
                await db_1.models.aiMarketMaker.update({ status: "ACTIVE" }, { where: { id: market.id } });
                await db_1.models.aiBot.update({ status: "ACTIVE" }, { where: { marketMakerId: market.id, status: "PAUSED" } });
                await db_1.models.aiMarketMakerHistory.create({
                    marketMakerId: market.id,
                    action: "RESUME",
                    details: { reason: "DAILY_RESET", note: "Market automatically resumed after daily reset" },
                    priceAtAction: market.targetPrice,
                    poolValueAtAction: 0,
                });
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to resume auto-paused market ${market.id}`, error);
        }
    }
}
async function processAiAnalyticsAggregator() {
    const cronName = "processAiAnalyticsAggregator";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting AI Analytics Aggregator");
        const markets = await db_1.models.aiMarketMaker.findAll({
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                { model: db_1.models.ecosystemMarket, as: "market" },
                { model: db_1.models.aiBot, as: "bots" },
            ],
        });
        const total = markets.length;
        if (total === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No markets to aggregate", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Aggregating analytics for ${total} markets`);
        for (let i = 0; i < total; i++) {
            const market = markets[i];
            try {
                await aggregateMarketAnalytics(market);
            }
            catch (error) {
                console_1.logger.error("AI_MM", `Failed to aggregate market analytics for ${market.id}`, error);
            }
            (0, broadcast_1.broadcastProgress)(cronName, Math.round(((i + 1) / total) * 100));
        }
        await aggregateGlobalStats();
        (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
        (0, broadcast_1.broadcastLog)(cronName, `AI Analytics Aggregator completed`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_ANALYTICS", "AI Analytics Aggregator failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        throw error;
    }
}
async function aggregateMarketAnalytics(market) {
    const pool = market.pool;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyTrades = await db_1.models.aiMarketMakerHistory.findAll({
        where: { marketMakerId: market.id, action: "TRADE", createdAt: { [sequelize_1.Op.gte]: oneWeekAgo } },
    });
    if (pool) {
        const totalRealizedPnL = weeklyTrades.reduce((sum, t) => { var _a; return sum + (((_a = t.details) === null || _a === void 0 ? void 0 : _a.pnl) || 0); }, 0);
        await db_1.models.aiMarketMakerPool.update({ realizedPnL: totalRealizedPnL }, { where: { id: pool.id } });
    }
}
async function aggregateGlobalStats() {
    const pools = await db_1.models.aiMarketMakerPool.findAll();
    let totalTvl = 0;
    for (const pool of pools) {
        totalTvl += Number(pool.totalValueLocked || 0);
    }
    const activeMarkets = await db_1.models.aiMarketMaker.count({ where: { status: "ACTIVE" } });
    const activeBots = await db_1.models.aiBot.count({ where: { status: "ACTIVE" } });
    (0, broadcast_1.broadcastLog)("processAiAnalyticsAggregator", `Global stats: TVL=$${totalTvl.toFixed(2)}, Markets=${activeMarkets}, Bots=${activeBots}`);
}
const PRICE_DEVIATION_ALERT_THRESHOLD = 10;
const priceCache = new Map();
const PRICE_CACHE_TTL = 10000;
async function processAiPriceSync() {
    const cronName = "processAiPriceSync";
    const startTime = Date.now();
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting AI Price Sync");
        const cacheManager = cache_1.CacheManager.getInstance();
        const tradingEnabled = await cacheManager.getSetting("aiMarketMakerEnabled");
        const isEnabled = tradingEnabled === true || tradingEnabled === "true";
        if (!isEnabled) {
            (0, broadcast_1.broadcastLog)(cronName, "AI Market Maker disabled, skipping price sync", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const activeMarkets = await db_1.models.aiMarketMaker.findAll({
            where: { status: "ACTIVE" },
            include: [{ model: db_1.models.ecosystemMarket, as: "market" }],
        });
        const total = activeMarkets.length;
        if (total === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No active markets to sync prices", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Syncing prices for ${total} active markets`);
        const alerts = [];
        for (let i = 0; i < total; i++) {
            const market = activeMarkets[i];
            try {
                const marketAlerts = await syncMarketPrice(market);
                alerts.push(...marketAlerts);
            }
            catch (error) {
                console_1.logger.error("AI_MM", `Failed to sync market price for ${market.id}`, error);
            }
            (0, broadcast_1.broadcastProgress)(cronName, Math.round(((i + 1) / total) * 100));
        }
        if (alerts.length > 0) {
            for (const alert of alerts) {
                (0, broadcast_1.broadcastLog)(cronName, alert, "warning");
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", { duration: Date.now() - startTime });
        (0, broadcast_1.broadcastLog)(cronName, `AI Price Sync completed`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_PRICE_SYNC", "AI Price Sync failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        throw error;
    }
}
async function syncMarketPrice(market) {
    var _a;
    const alerts = [];
    const symbol = (_a = market.market) === null || _a === void 0 ? void 0 : _a.symbol;
    if (!symbol)
        return alerts;
    const externalPrice = await fetchExternalPrice(symbol);
    if (!externalPrice)
        return alerts;
    const targetPrice = Number(market.targetPrice);
    const deviation = Math.abs((targetPrice - externalPrice) / externalPrice) * 100;
    if (deviation > PRICE_DEVIATION_ALERT_THRESHOLD) {
        alerts.push(`${symbol}: Target price $${targetPrice.toFixed(6)} deviates ${deviation.toFixed(2)}% from external $${externalPrice.toFixed(6)}`);
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: market.id,
            action: "CONFIG_CHANGE",
            details: { field: "PRICE_DEVIATION_ALERT", previousValue: targetPrice, newValue: externalPrice, note: `Deviation: ${deviation.toFixed(2)}% for ${symbol}` },
            priceAtAction: targetPrice,
            poolValueAtAction: 0,
        });
    }
    return alerts;
}
async function fetchExternalPrice(symbol) {
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
        return cached.price;
    }
    try {
        const [currency, pair] = symbol.split("/");
        if (!currency || !pair)
            return null;
        const exchange = await exchange_1.default.startExchange();
        if (!exchange)
            return null;
        const ticker = await exchange.fetchTicker(symbol);
        if (ticker && ticker.last) {
            const price = Number(ticker.last);
            priceCache.set(symbol, { price, timestamp: Date.now() });
            return price;
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
function getCachedExternalPrice(symbol) {
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL * 3) {
        return cached.price;
    }
    return null;
}
async function forceRefreshPrice(symbol) {
    priceCache.delete(symbol);
    return fetchExternalPrice(symbol);
}
