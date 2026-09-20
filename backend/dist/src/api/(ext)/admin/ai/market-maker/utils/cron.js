"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAiMarketMakerSupervisor = startAiMarketMakerSupervisor;
exports.stopAiMarketMakerSupervisor = stopAiMarketMakerSupervisor;
exports.processAiMarketMakerEngine = processAiMarketMakerEngine;
exports.syncMarketStatuses = syncMarketStatuses;
exports.processAiRiskMonitor = processAiRiskMonitor;
exports.processAiPoolRebalancer = processAiPoolRebalancer;
exports.processAiDailyReset = processAiDailyReset;
exports.processAiAnalyticsAggregator = processAiAnalyticsAggregator;
exports.processAiPriceSync = processAiPriceSync;
exports.getCachedExternalPrice = getCachedExternalPrice;
exports.forceRefreshPrice = forceRefreshPrice;
exports.processAiHistoryRetention = processAiHistoryRetention;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const broadcast_1 = require("@b/cron/broadcast");
const cache_1 = require("@b/utils/cache");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const redis_1 = require("@b/utils/redis");
const volatility_1 = require("./volatility");
const mode_1 = require("@b/cron/mode");
const engine_lease_1 = require("@b/utils/engine-lease");
const MarketMakerEngine_1 = __importDefault(require("./engine/MarketMakerEngine"));
const market_resolver_1 = require("./venue/market-resolver");
const follow_band_1 = require("./engine/external/follow-band");
function reportsToCronDashboard() {
    return !(0, mode_1.isCronDelegated)();
}
function broadcastStatus(...args) {
    if (!reportsToCronDashboard())
        return;
    return (0, broadcast_1.broadcastStatus)(...args);
}
function broadcastProgress(...args) {
    if (!reportsToCronDashboard())
        return;
    return (0, broadcast_1.broadcastProgress)(...args);
}
function broadcastLog(...args) {
    if (!reportsToCronDashboard())
        return;
    return (0, broadcast_1.broadcastLog)(...args);
}
function asBool(value, dflt) {
    if (value === undefined || value === null || value === "")
        return dflt;
    return value === true || value === "true";
}
function parseHistoryDetails(value) {
    if (!value)
        return {};
    if (typeof value === "object")
        return value;
    try {
        const parsed = JSON.parse(String(value));
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch (_a) {
        return {};
    }
}
function utcDayKey(d) {
    return d.toISOString().split("T")[0];
}
const redis = redis_1.RedisSingleton.getInstance();
let engineInitialized = false;
let cronInProgress = false;
let lastExecutionTime = 0;
const MIN_EXECUTION_INTERVAL_MS = 4000;
const SUPERVISOR_PERIOD_MS = 5000;
let supervisorTimer = null;
let lastRefusalBroadcastAt = 0;
const REFUSAL_BROADCAST_INTERVAL_MS = 5 * 60000;
function engineMayRunHere() {
    if (!(0, engine_lease_1.isEngineLeaseCandidate)(engine_lease_1.ENGINE_LEASE_KEYS.AI_MARKET_MAKER)) {
        return "this is the dedicated cron process (CRON_MODE=only)";
    }
    if ((0, engine_lease_1.isEngineLeaseFollower)(engine_lease_1.ENGINE_LEASE_KEYS.ECOSYSTEM_MATCHING)) {
        return "this process's ecosystem matcher is a read-only follower";
    }
    return null;
}
function startAiMarketMakerSupervisor() {
    var _a;
    if (supervisorTimer)
        return;
    if (!(0, mode_1.isCronDelegated)()) {
        console_1.logger.error("AI_MM", "Refusing to arm the market maker supervisor: this process registers its own cron jobs, " +
            "so processAiMarketMakerEngine already drives the engine here. Arming both would double " +
            "the tick rate.");
        return;
    }
    console_1.logger.debug("AI_MM", "Driving the AI market maker engine from this process: it holds the ecosystem matching " +
        `lease and cron has been delegated elsewhere (${SUPERVISOR_PERIOD_MS}ms supervisor tick).`);
    supervisorTimer = setInterval(() => {
        void processAiMarketMakerEngine();
    }, SUPERVISOR_PERIOD_MS);
    (_a = supervisorTimer.unref) === null || _a === void 0 ? void 0 : _a.call(supervisorTimer);
    void processAiMarketMakerEngine();
}
async function stopAiMarketMakerSupervisor() {
    if (supervisorTimer) {
        clearInterval(supervisorTimer);
        supervisorTimer = null;
    }
    await shutdownLocalEngine("the ecosystem matching lease was lost");
}
let localShutdown = null;
async function shutdownLocalEngine(reason) {
    if (!engineInitialized && MarketMakerEngine_1.default.getStatus().status === "STOPPED")
        return;
    if (localShutdown)
        return localShutdown;
    localShutdown = (async () => {
        try {
            console_1.logger.warn("AI_MM", `Shutting down the market maker engine: ${reason}`);
            await MarketMakerEngine_1.default.shutdown();
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Failed to shut the market maker engine down", error);
        }
        finally {
            engineInitialized = false;
        }
    })().finally(() => {
        localShutdown = null;
    });
    return localShutdown;
}
async function processAiMarketMakerEngine() {
    const cronName = "processAiMarketMakerEngine";
    const startTime = Date.now();
    const refusal = engineMayRunHere();
    if (refusal) {
        await shutdownLocalEngine(refusal);
        const note = `Market maker engine not run here: ${refusal}. The process holding the ecosystem ` +
            "matching lease runs it, because bot orders only reach the matcher in its own process.";
        (0, engine_lease_1.noteEngineRunsElsewhere)("AI_MM", note);
        if (startTime - lastRefusalBroadcastAt >= REFUSAL_BROADCAST_INTERVAL_MS) {
            lastRefusalBroadcastAt = startTime;
            broadcastLog(cronName, note, "info");
        }
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
        return;
    }
    (0, engine_lease_1.clearEngineElsewhereNotice)("AI_MM");
    if (cronInProgress) {
        broadcastLog(cronName, "Previous execution still in progress, skipping", "info");
        return;
    }
    if (startTime - lastExecutionTime < MIN_EXECUTION_INTERVAL_MS) {
        return;
    }
    cronInProgress = true;
    lastExecutionTime = startTime;
    try {
        broadcastStatus(cronName, "running");
        const settings = await getGlobalSettings();
        if (!settings.tradingEnabled) {
            if (engineInitialized && MarketMakerEngine_1.default.getStatus().status === "RUNNING") {
                broadcastLog(cronName, "AI Market Maker disabled, shutting down engine", "warning");
                await MarketMakerEngine_1.default.shutdown();
                engineInitialized = false;
            }
            broadcastLog(cronName, "AI Market Maker is disabled globally", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        if (settings.maintenanceMode) {
            if (engineInitialized && MarketMakerEngine_1.default.getStatus().status === "RUNNING") {
                broadcastLog(cronName, "Maintenance mode, shutting down engine", "warning");
                await MarketMakerEngine_1.default.shutdown();
                engineInitialized = false;
            }
            broadcastLog(cronName, "AI Market Maker is in maintenance mode", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        if (settings.globalPauseEnabled) {
            broadcastLog(cronName, "AI Market Maker is globally paused", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const engineStatus = MarketMakerEngine_1.default.getStatus();
        if (!engineInitialized || engineStatus.status === "STOPPED") {
            broadcastLog(cronName, "Initializing AI Market Maker Engine...", "info");
            try {
                await MarketMakerEngine_1.default.initialize({
                    tickIntervalMs: 1000,
                    maxConcurrentMarkets: settings.maxConcurrentBots || 50,
                    enableRealLiquidity: true,
                    emergencyStopEnabled: true,
                });
                engineInitialized = true;
                broadcastLog(cronName, "AI Market Maker Engine initialized successfully", "success");
            }
            catch (initError) {
                console_1.logger.error("AI_MARKET_MAKER", "Failed to initialize engine", initError);
                broadcastLog(cronName, `Failed to initialize engine: ${initError.message}`, "error");
                broadcastStatus(cronName, "failed");
                return;
            }
        }
        const status = MarketMakerEngine_1.default.getStatus();
        broadcastLog(cronName, `Engine running: ${status.activeMarkets} markets, ${status.tickCount} ticks, ${status.errorCount} errors`, "info");
        await syncMarketStatuses(MarketMakerEngine_1.default);
        broadcastProgress(cronName, 100);
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    }
    catch (error) {
        console_1.logger.error("AI_MARKET_MAKER", "AI Market Maker Engine failed", error);
        broadcastStatus(cronName, "failed");
        broadcastLog(cronName, `AI Market Maker Engine failed: ${error.message}`, "error");
    }
    finally {
        cronInProgress = false;
    }
}
const startBackoff = new Map();
const START_BACKOFF_BASE_MS = 30000;
const START_BACKOFF_MAX_LEVEL = 5;
async function syncMarketStatuses(engine) {
    var _a, _b, _c;
    var _d;
    const cronName = "processAiMarketMakerEngine";
    const marketManager = engine.getMarketManager();
    if (!marketManager)
        return;
    try {
        await restoreExpiredCooldowns(cronName);
        const marketMakers = (0, market_resolver_1.hydrateMakerMarkets)(await db_1.models.aiMarketMaker.findAll({
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                ...(0, market_resolver_1.makerMarketIncludes)(),
                { model: db_1.models.aiBot, as: "bots" },
            ],
        }));
        const liveIds = new Set(marketMakers.map((m) => m.id));
        for (const id of [...startBackoff.keys()]) {
            if (!liveIds.has(id))
                startBackoff.delete(id);
        }
        for (const maker of marketMakers) {
            const makerAny = maker;
            const isRunningInEngine = marketManager.isMarketActive(makerAny.id);
            const label = ((_a = makerAny.market) === null || _a === void 0 ? void 0 : _a.symbol) || makerAny.id;
            const engineStatus = marketManager.getMarketStatus(makerAny.id);
            if (makerAny.status === "ACTIVE" && !isRunningInEngine) {
                const backoff = startBackoff.get(makerAny.id);
                const nowMs = Date.now();
                if (backoff && nowMs < backoff.nextAttemptMs)
                    continue;
                broadcastLog(cronName, `Starting market ${label}`, "info");
                const started = await marketManager.startMarket(makerAny);
                if (started) {
                    startBackoff.delete(makerAny.id);
                }
                else {
                    const failures = ((_d = backoff === null || backoff === void 0 ? void 0 : backoff.failures) !== null && _d !== void 0 ? _d : 0) + 1;
                    const level = Math.min(failures - 1, START_BACKOFF_MAX_LEVEL);
                    const waitMs = START_BACKOFF_BASE_MS * (1 << level);
                    startBackoff.set(makerAny.id, {
                        failures,
                        nextAttemptMs: Date.now() + waitMs,
                    });
                    console_1.logger.warn("AI_MARKET_MAKER", `Market ${label} failed to start (attempt ${failures}); next retry in ${Math.round(waitMs / 1000)}s`);
                }
            }
            else if (makerAny.status === "STOPPED" && isRunningInEngine) {
                broadcastLog(cronName, `Stopping market ${label}`, "info");
                await marketManager.stopMarket(makerAny.id);
            }
            else if (makerAny.status === "PAUSED" && engineStatus === "RUNNING") {
                broadcastLog(cronName, `Pausing market ${label} (row is PAUSED)`, "warning");
                await marketManager.pauseMarket(makerAny.id);
            }
            else if (makerAny.status === "ACTIVE" && engineStatus === "PAUSED") {
                const instance = (_b = marketManager.getMarketInstance) === null || _b === void 0 ? void 0 : _b.call(marketManager, makerAny.id);
                if ((_c = instance === null || instance === void 0 ? void 0 : instance.isErrorPaused) === null || _c === void 0 ? void 0 : _c.call(instance))
                    continue;
                broadcastLog(cronName, `Resuming market ${label} (row is ACTIVE)`, "info");
                await marketManager.resumeMarket(makerAny.id);
            }
        }
    }
    catch (error) {
        console_1.logger.error("AI_MARKET_MAKER", "Failed to sync market statuses", error);
        broadcastLog(cronName, `Failed to sync market statuses: ${error.message}`, "error");
    }
}
async function restoreExpiredCooldowns(cronName) {
    try {
        const [restored] = await db_1.models.aiBot.update({ status: "ACTIVE", cooldownUntil: null }, {
            where: {
                status: "COOLDOWN",
                cooldownUntil: { [sequelize_1.Op.ne]: null, [sequelize_1.Op.lte]: new Date() },
                marketMakerId: {
                    [sequelize_1.Op.in]: db_1.sequelize.literal("(SELECT id FROM ai_market_maker WHERE status = 'ACTIVE')"),
                },
            },
        });
        if (restored > 0) {
            broadcastLog(cronName, `Restored ${restored} bot(s) from cooldown`, "info");
        }
    }
    catch (error) {
        console_1.logger.error("AI_MARKET_MAKER", "Failed to restore expired cooldowns", error);
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
            tradingEnabled: asBool(tradingEnabled, true),
            globalPauseEnabled: asBool(globalPauseEnabled, false),
            maintenanceMode: asBool(maintenanceMode, false),
            maxConcurrentBots: maxConcurrentBots || 50,
        };
    }
    catch (error) {
        console_1.logger.error("AI_SETTINGS", "Failed to get global settings", error);
        return {
            tradingEnabled: false,
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
        broadcastStatus(cronName, "running");
        broadcastLog(cronName, "Starting AI Risk Monitor check");
        const settings = await getAiMarketMakerSettings();
        if (!settings.tradingEnabled) {
            broadcastLog(cronName, "AI Market Maker disabled, skipping risk check", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const activeMarkets = (0, market_resolver_1.hydrateMakerMarkets)(await db_1.models.aiMarketMaker.findAll({
            where: { status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] } },
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                ...(0, market_resolver_1.makerMarketIncludes)(),
            ],
        }));
        const total = activeMarkets.length;
        if (total === 0) {
            broadcastLog(cronName, "No active markets to monitor", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        broadcastLog(cronName, `Monitoring ${total} markets for risk`);
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
            broadcastProgress(cronName, progress);
        }
        if (alerts.length > 0) {
            broadcastLog(cronName, `Risk alerts found: ${alerts.length}`, "warning");
            for (const alert of alerts) {
                broadcastLog(cronName, alert, "warning");
            }
        }
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
        broadcastLog(cronName, `AI Risk Monitor completed in ${Date.now() - startTime}ms`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_RISK_MONITOR", "AI Risk Monitor failed", error);
        broadcastStatus(cronName, "failed");
        broadcastLog(cronName, `AI Risk Monitor failed: ${error.message}`, "error");
        throw error;
    }
}
async function checkMarketRisk(market, settings) {
    var _a;
    var _b;
    const alerts = [];
    const pool = market.pool;
    const symbol = ((_a = market.market) === null || _a === void 0 ? void 0 : _a.symbol) || market.id;
    const [volatility, dailyPnL, lastTradeTime] = await Promise.all([
        market.pauseOnHighVolatility ? calculateVolatility(market.id) : Promise.resolve(0),
        pool ? calculateDailyPnL(market.id) : Promise.resolve(0),
        market.status === "ACTIVE" ? getLastTradeTime(market.id) : Promise.resolve(null),
    ]);
    if (market.pauseOnHighVolatility) {
        const threshold = market.volatilityThreshold || settings.defaultVolatilityThreshold;
        const follow = await assessFollowTracking(market);
        if (follow.tethered) {
            if (follow.breached) {
                alerts.push(`${symbol} has come adrift from ${follow.symbol}: price ${follow.price} vs reference ` +
                    `${follow.reference} (${(((_b = follow.error) !== null && _b !== void 0 ? _b : 0) * 100).toFixed(2)}% off, outside its tracking band)`);
            }
            else if (follow.reference === null) {
                alerts.push(`${symbol} is set to follow ${follow.symbol} but no reference price is arriving; ` +
                    `it is running autonomously`);
            }
        }
        else if (volatility > threshold) {
            alerts.push(`High volatility detected for ${symbol}: ${volatility.toFixed(2)}% (threshold: ${threshold}%)`);
            if (market.status === "ACTIVE") {
                await pauseMarketForVolatility(market);
                alerts.push(`Market ${symbol} auto-paused due to high volatility`);
            }
        }
    }
    if (pool) {
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
                action: { [sequelize_1.Op.in]: ["TRADE", "TARGET_CHANGE", "START"] },
                createdAt: { [sequelize_1.Op.gte]: oneHourAgo },
            },
            attributes: ["priceAtAction", "createdAt", "action"],
            order: [["createdAt", "DESC"]],
            limit: 200,
            raw: true,
        });
        if (recentHistory.length < 2)
            return 0;
        return (0, volatility_1.dailyVolatility)(recentHistory.map((h) => ({
            price: Number(h.priceAtAction),
            at: h.createdAt,
            isRestart: h.action === "START",
        })));
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to calculate volatility", error);
        return 0;
    }
}
async function assessFollowTracking(market) {
    var _a;
    const idle = {
        tethered: false,
        symbol: null,
        reference: null,
        price: null,
        error: null,
        breached: false,
    };
    try {
        const mode = String((_a = market.priceMode) !== null && _a !== void 0 ? _a : "AUTONOMOUS");
        if (mode !== "FOLLOW_EXTERNAL" && mode !== "HYBRID")
            return idle;
        const externalSymbol = market.externalSymbol ? String(market.externalSymbol) : null;
        if (!externalSymbol)
            return idle;
        const reference = await fetchExternalPrice(externalSymbol);
        const price = Number(market.lastKnownPrice);
        if (reference === null || !(price > 0)) {
            return {
                tethered: true,
                symbol: externalSymbol,
                reference,
                price: price > 0 ? price : null,
                error: null,
                breached: false,
            };
        }
        const band = (0, follow_band_1.resolveFollowBand)({
            priceMode: mode,
            externalPrice: reference,
            targetPrice: market.targetPrice,
            priceRangeLow: market.priceRangeLow,
            priceRangeHigh: market.priceRangeHigh,
        });
        const breached = band.following &&
            band.priceRangeLow > 0 &&
            band.priceRangeHigh > band.priceRangeLow &&
            (price < band.priceRangeLow || price > band.priceRangeHigh);
        return {
            tethered: true,
            symbol: externalSymbol,
            reference,
            price,
            error: (0, follow_band_1.trackingError)(price, reference),
            breached,
        };
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to assess follow tracking", error);
        return idle;
    }
}
const dailyPnLBaselines = new Map();
async function getDailyPnLBaseline(marketMakerId, startOfDay, currentCumulative) {
    const dayStartMs = startOfDay.getTime();
    const existing = dailyPnLBaselines.get(marketMakerId);
    if (existing && existing.dayStartMs === dayStartMs) {
        return existing.cumulative;
    }
    dailyPnLBaselines.set(marketMakerId, {
        dayStartMs,
        cumulative: currentCumulative,
    });
    return currentCumulative;
}
async function calculateDailyPnL(marketMakerId) {
    try {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const bots = await db_1.models.aiBot.findAll({
            where: { marketMakerId },
            attributes: ["id", "totalRealizedPnL"],
        });
        const cumulative = bots.reduce((sum, b) => sum + (Number(b.totalRealizedPnL) || 0), 0);
        const baseline = await getDailyPnLBaseline(marketMakerId, startOfDay, cumulative);
        return cumulative - baseline;
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to calculate daily PnL", error);
        return 0;
    }
}
async function getLastTradeTime(marketMakerId) {
    var _a;
    try {
        const lastTrade = await db_1.models.aiMarketMakerHistory.findOne({
            where: { marketMakerId, action: "TRADE" },
            order: [["createdAt", "DESC"]],
            attributes: ["createdAt"],
            raw: true,
        });
        return (_a = lastTrade === null || lastTrade === void 0 ? void 0 : lastTrade.createdAt) !== null && _a !== void 0 ? _a : null;
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to get last trade time", error);
        return null;
    }
}
async function pauseMarketForVolatility(market) {
    var _a;
    try {
        const [paused] = await db_1.models.aiMarketMaker.update({ status: "PAUSED" }, { where: { id: market.id, status: "ACTIVE" } });
        if (!paused)
            return;
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
        const [paused] = await db_1.models.aiMarketMaker.update({ status: "PAUSED" }, { where: { id: market.id, status: "ACTIVE" } });
        if (!paused)
            return;
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
            tradingEnabled: asBool(tradingEnabled, true),
            maxDailyLossPercent: maxDailyLossPercent || 5,
            defaultVolatilityThreshold: defaultVolatilityThreshold || 10,
            minLiquidity: minLiquidity || 100,
            stopLossEnabled: asBool(stopLossEnabled, true),
        };
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to get AI market maker settings", error);
        return { tradingEnabled: false, maxDailyLossPercent: 5, defaultVolatilityThreshold: 10, minLiquidity: 100, stopLossEnabled: true };
    }
}
const MIN_RATIO_THRESHOLD = 0.2;
const MAX_RATIO_THRESHOLD = 0.8;
const TARGET_RATIO = 0.5;
async function processAiPoolRebalancer() {
    const cronName = "processAiPoolRebalancer";
    const startTime = Date.now();
    try {
        broadcastStatus(cronName, "running");
        broadcastLog(cronName, "Starting AI Pool Rebalancer");
        const cacheManager = cache_1.CacheManager.getInstance();
        const tradingEnabled = await cacheManager.getSetting("aiMarketMakerEnabled");
        if (!asBool(tradingEnabled, true)) {
            broadcastLog(cronName, "AI Market Maker disabled, skipping rebalance", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const marketsWithPools = (0, market_resolver_1.hydrateMakerMarkets)(await db_1.models.aiMarketMaker.findAll({
            where: { status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] } },
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                ...(0, market_resolver_1.makerMarketIncludes)(),
            ],
        }));
        const total = marketsWithPools.length;
        if (total === 0) {
            broadcastLog(cronName, "No markets with pools to check", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        broadcastLog(cronName, `Checking ${total} pools for rebalancing`);
        let flaggedCount = 0;
        for (let i = 0; i < total; i++) {
            const market = marketsWithPools[i];
            const pool = market.pool;
            if (!pool)
                continue;
            try {
                if (checkPoolNeedsRebalance(market, pool)) {
                    await rebalancePool(market, pool);
                    flaggedCount++;
                }
            }
            catch (error) {
                console_1.logger.error("AI_REBALANCER", `Failed to rebalance pool ${pool.id}`, error);
            }
            broadcastProgress(cronName, Math.round(((i + 1) / total) * 100));
        }
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
        broadcastLog(cronName, `AI Pool Rebalancer completed. Flagged ${flaggedCount} imbalanced pools (no automatic asset movement)`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_REBALANCER", "AI Pool Rebalancer failed", error);
        broadcastStatus(cronName, "failed");
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
    broadcastLog(cronName, `Pool imbalance detected for ${symbol}: base ${(currentBaseRatio * 100).toFixed(1)}% (target ${(TARGET_RATIO * 100).toFixed(1)}%) — manual rebalance required; no automatic asset movement performed`, "warning");
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: market.id,
        action: "CONFIG_CHANGE",
        details: {
            field: "poolImbalanceAlert",
            previousValue: { baseCurrencyBalance, quoteCurrencyBalance, baseRatio: currentBaseRatio },
            newValue: { targetBaseRatio: TARGET_RATIO },
            note: "POOL_IMBALANCE_DETECTED (no automatic rebalance — balances unchanged). " +
                "To act on this, POST pool/{marketId}/rebalance with mode EXECUTE while the market maker is paused.",
        },
        priceAtAction: targetPrice,
        poolValueAtAction: totalValue,
    });
}
async function processAiDailyReset() {
    const cronName = "processAiDailyReset";
    const startTime = Date.now();
    try {
        broadcastStatus(cronName, "running");
        broadcastLog(cronName, "Starting AI Daily Reset");
        broadcastLog(cronName, "Generating daily summaries...");
        await generateDailySummaries();
        broadcastProgress(cronName, 25);
        if (await dailyCountersAlreadyReset()) {
            broadcastLog(cronName, "Daily counters already reset for this UTC day, skipping", "info");
            broadcastProgress(cronName, 75);
        }
        else {
            broadcastLog(cronName, "Resetting market daily volumes...");
            await resetMarketDailyVolumes();
            broadcastProgress(cronName, 50);
            broadcastLog(cronName, "Resetting bot daily trade counts...");
            await resetBotDailyTradeCounts();
            broadcastProgress(cronName, 75);
            await markDailyCountersReset();
        }
        broadcastLog(cronName, "Checking for markets to resume...");
        await resumeAutoPausedMarkets();
        broadcastProgress(cronName, 100);
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
        broadcastLog(cronName, `AI Daily Reset completed in ${Date.now() - startTime}ms`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_DAILY_RESET", "AI Daily Reset failed", error);
        broadcastStatus(cronName, "failed");
        throw error;
    }
}
async function generateDailySummaries() {
    var _a;
    const markets = (0, market_resolver_1.hydrateMakerMarkets)(await db_1.models.aiMarketMaker.findAll({
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            ...(0, market_resolver_1.makerMarketIncludes)(),
        ],
    }));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const summaryDate = utcDayKey(yesterday);
    for (const market of markets) {
        try {
            const todaysConfigRows = await db_1.models.aiMarketMakerHistory.findAll({
                where: {
                    marketMakerId: market.id,
                    action: "CONFIG_CHANGE",
                    createdAt: { [sequelize_1.Op.gte]: today },
                },
                order: [["createdAt", "DESC"]],
                limit: 200,
            });
            const alreadySummarised = todaysConfigRows.some((row) => {
                var _a;
                const details = parseHistoryDetails(row.details);
                return ((details === null || details === void 0 ? void 0 : details.field) === "DAILY_SUMMARY" &&
                    ((_a = details === null || details === void 0 ? void 0 : details.newValue) === null || _a === void 0 ? void 0 : _a.date) === summaryDate);
            });
            if (alreadySummarised)
                continue;
            const trades = await db_1.models.aiMarketMakerHistory.findAll({
                where: {
                    marketMakerId: market.id,
                    action: "TRADE",
                    createdAt: { [sequelize_1.Op.gte]: yesterday, [sequelize_1.Op.lt]: today },
                },
                attributes: ["details"],
            });
            if (trades.length === 0)
                continue;
            let totalVolume = 0;
            for (const trade of trades) {
                const details = trade.details || {};
                totalVolume += (Number(details.amount) || 0) * (Number(details.price) || 0);
            }
            await db_1.models.aiMarketMakerHistory.create({
                marketMakerId: market.id,
                action: "CONFIG_CHANGE",
                details: {
                    field: "DAILY_SUMMARY",
                    previousValue: null,
                    newValue: {
                        date: summaryDate,
                        totalTrades: trades.length,
                        totalVolume,
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
const ENGINE_DAILY_RESET_KEY = "ai_market_maker:last_daily_reset";
const CRON_DAILY_RESET_KEY = "ai_market_maker:cron:last_daily_reset";
async function dailyCountersAlreadyReset() {
    const today = utcDayKey(new Date());
    try {
        for (const key of [ENGINE_DAILY_RESET_KEY, CRON_DAILY_RESET_KEY]) {
            const last = await redis.get(key);
            if (!last)
                continue;
            const at = new Date(last);
            if (!Number.isNaN(at.getTime()) && utcDayKey(at) === today)
                return true;
        }
        return false;
    }
    catch (error) {
        console_1.logger.debug("AI_DAILY_RESET", "Daily reset day-key check unavailable", error);
        return false;
    }
}
async function markDailyCountersReset() {
    try {
        await redis.set(CRON_DAILY_RESET_KEY, new Date().toISOString());
    }
    catch (error) {
        console_1.logger.debug("AI_DAILY_RESET", "Failed to record the daily reset day-key", error);
    }
}
async function resetMarketDailyVolumes() {
    await db_1.models.aiMarketMaker.update({ currentDailyVolume: 0 }, { where: {} });
}
async function resetBotDailyTradeCounts() {
    await db_1.models.aiBot.update({ dailyTradeCount: 0 }, { where: {} });
}
const AUTO_PAUSE_MIRROR_WINDOW_MS = 120000;
const VOLATILITY_RESUME_FRACTION = 0.8;
async function resumeAutoPausedMarkets() {
    var _a;
    var _b, _c;
    const currentDayKey = utcDayKey(new Date());
    const settings = await getAiMarketMakerSettings();
    const pausedMarkets = await db_1.models.aiMarketMaker.findAll({
        where: { status: "PAUSED" },
    });
    if (pausedMarkets.length === 0)
        return;
    for (const market of pausedMarkets) {
        try {
            const recentStatusRows = await db_1.models.aiMarketMakerHistory.findAll({
                where: {
                    marketMakerId: market.id,
                    action: {
                        [sequelize_1.Op.in]: ["AUTO_PAUSE", "PAUSE", "RESUME", "START", "STOP", "EMERGENCY_STOP"],
                    },
                },
                order: [["createdAt", "DESC"]],
                limit: 5,
            });
            const pauseIndex = recentStatusRows.findIndex((row) => row.action === "AUTO_PAUSE");
            if (pauseIndex === -1)
                continue;
            const lastPause = recentStatusRows[pauseIndex];
            const pauseCreatedAt = lastPause.createdAt;
            const pauseTime = pauseCreatedAt ? new Date(pauseCreatedAt).getTime() : 0;
            const supersededByLaterDecision = recentStatusRows
                .slice(0, pauseIndex)
                .some((row) => row.action !== "PAUSE" ||
                new Date(row.createdAt).getTime() - pauseTime > AUTO_PAUSE_MIRROR_WINDOW_MS);
            if (supersededByLaterDecision)
                continue;
            const pauseDayKey = pauseCreatedAt ? utcDayKey(new Date(pauseCreatedAt)) : null;
            const pauseReason = String((_b = (_a = lastPause === null || lastPause === void 0 ? void 0 : lastPause.details) === null || _a === void 0 ? void 0 : _a.reason) !== null && _b !== void 0 ? _b : "");
            const isDailyLossPause = pauseReason === "DAILY_LOSS_LIMIT" || /daily loss/i.test(pauseReason);
            const isVolatilityPause = pauseReason === "HIGH_VOLATILITY" || /volatilit/i.test(pauseReason);
            if (isVolatilityPause) {
                const mode = String((_c = market.priceMode) !== null && _c !== void 0 ? _c : "AUTONOMOUS");
                const tethered = (mode === "FOLLOW_EXTERNAL" || mode === "HYBRID") &&
                    Boolean(market.externalSymbol);
                let resumeNote = null;
                if (tethered) {
                    resumeNote =
                        "Market follows an external reference; the absolute-volatility guard no longer applies";
                }
                else {
                    const threshold = Number(market.volatilityThreshold) ||
                        settings.defaultVolatilityThreshold;
                    const measured = await calculateVolatility(market.id);
                    if (threshold > 0 && measured < threshold * VOLATILITY_RESUME_FRACTION) {
                        resumeNote = `Volatility fell back to ${measured.toFixed(2)}% against a ${threshold}% threshold`;
                    }
                }
                if (resumeNote) {
                    const [resumed] = await db_1.models.aiMarketMaker.update({ status: "ACTIVE" }, { where: { id: market.id, status: "PAUSED" } });
                    if (!resumed)
                        continue;
                    await db_1.models.aiBot.update({ status: "ACTIVE" }, { where: { marketMakerId: market.id, status: "PAUSED" } });
                    await db_1.models.aiMarketMakerHistory.create({
                        marketMakerId: market.id,
                        action: "RESUME",
                        details: { reason: "VOLATILITY_CLEARED", note: resumeNote },
                        priceAtAction: market.targetPrice,
                        poolValueAtAction: 0,
                    });
                }
                continue;
            }
            if (isDailyLossPause && pauseDayKey && pauseDayKey !== currentDayKey) {
                const [resumed] = await db_1.models.aiMarketMaker.update({ status: "ACTIVE" }, { where: { id: market.id, status: "PAUSED" } });
                if (!resumed)
                    continue;
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
        broadcastStatus(cronName, "running");
        broadcastLog(cronName, "Starting AI Analytics Aggregator");
        const markets = (0, market_resolver_1.hydrateMakerMarkets)(await db_1.models.aiMarketMaker.findAll({
            include: [
                { model: db_1.models.aiMarketMakerPool, as: "pool" },
                ...(0, market_resolver_1.makerMarketIncludes)(),
                { model: db_1.models.aiBot, as: "bots" },
            ],
        }));
        const total = markets.length;
        if (total === 0) {
            broadcastLog(cronName, "No markets to aggregate", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        broadcastLog(cronName, `Aggregating analytics for ${total} markets`);
        for (let i = 0; i < total; i++) {
            const market = markets[i];
            try {
                await aggregateMarketAnalytics(market);
            }
            catch (error) {
                console_1.logger.error("AI_MM", `Failed to aggregate market analytics for ${market.id}`, error);
            }
            broadcastProgress(cronName, Math.round(((i + 1) / total) * 100));
        }
        await aggregateGlobalStats();
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
        broadcastLog(cronName, `AI Analytics Aggregator completed`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_ANALYTICS", "AI Analytics Aggregator failed", error);
        broadcastStatus(cronName, "failed");
        throw error;
    }
}
async function aggregateMarketAnalytics(market) {
    void market;
}
async function aggregateGlobalStats() {
    const pools = await db_1.models.aiMarketMakerPool.findAll();
    let totalTvl = 0;
    for (const pool of pools) {
        totalTvl += Number(pool.totalValueLocked || 0);
    }
    const activeMarkets = await db_1.models.aiMarketMaker.count({ where: { status: "ACTIVE" } });
    const activeBots = await db_1.models.aiBot.count({ where: { status: "ACTIVE" } });
    broadcastLog("processAiAnalyticsAggregator", `Global stats: TVL=$${totalTvl.toFixed(2)}, Markets=${activeMarkets}, Bots=${activeBots}`);
}
const PRICE_DEVIATION_ALERT_THRESHOLD = 10;
const priceCache = new Map();
const PRICE_CACHE_TTL = 5 * 60 * 1000;
const unavailableSymbols = new Map();
const UNAVAILABLE_SYMBOL_TTL = 60 * 60 * 1000;
const PRICE_SYNC_BUDGET_MS = 20000;
const deviationAlertAt = new Map();
const DEVIATION_ALERT_COOLDOWN_MS = 60 * 60 * 1000;
async function processAiPriceSync() {
    const cronName = "processAiPriceSync";
    const startTime = Date.now();
    try {
        broadcastStatus(cronName, "running");
        broadcastLog(cronName, "Starting AI Price Sync");
        const cacheManager = cache_1.CacheManager.getInstance();
        const tradingEnabled = await cacheManager.getSetting("aiMarketMakerEnabled");
        if (!asBool(tradingEnabled, true)) {
            broadcastLog(cronName, "AI Market Maker disabled, skipping price sync", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const activeMarkets = (0, market_resolver_1.hydrateMakerMarkets)(await db_1.models.aiMarketMaker.findAll({
            where: { status: "ACTIVE" },
            include: [...(0, market_resolver_1.makerMarketIncludes)()],
        }));
        const total = activeMarkets.length;
        if (total === 0) {
            broadcastLog(cronName, "No active markets to sync prices", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        broadcastLog(cronName, `Syncing prices for ${total} active markets`);
        const alerts = [];
        for (let i = 0; i < total; i++) {
            const market = activeMarkets[i];
            if (Date.now() - startTime > PRICE_SYNC_BUDGET_MS) {
                broadcastLog(cronName, `Price sync budget exhausted after ${i} of ${total} markets`, "warning");
                break;
            }
            try {
                const marketAlerts = await syncMarketPrice(market);
                alerts.push(...marketAlerts);
            }
            catch (error) {
                console_1.logger.error("AI_MM", `Failed to sync market price for ${market.id}`, error);
            }
            broadcastProgress(cronName, Math.round(((i + 1) / total) * 100));
        }
        if (alerts.length > 0) {
            for (const alert of alerts) {
                broadcastLog(cronName, alert, "warning");
            }
        }
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
        broadcastLog(cronName, `AI Price Sync completed`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_PRICE_SYNC", "AI Price Sync failed", error);
        broadcastStatus(cronName, "failed");
        throw error;
    }
}
async function syncMarketPrice(market) {
    var _a;
    const alerts = [];
    const m = market.market;
    const symbol = (m === null || m === void 0 ? void 0 : m.currency) && (m === null || m === void 0 ? void 0 : m.pair) ? `${m.currency}/${m.pair}` : null;
    if (!symbol)
        return alerts;
    const externalPrice = await fetchExternalPrice(symbol);
    if (!externalPrice)
        return alerts;
    const targetPrice = Number(market.targetPrice);
    const deviation = Math.abs((targetPrice - externalPrice) / externalPrice) * 100;
    if (deviation > PRICE_DEVIATION_ALERT_THRESHOLD) {
        alerts.push(`${symbol}: Target price $${targetPrice.toFixed(6)} deviates ${deviation.toFixed(2)}% from external $${externalPrice.toFixed(6)}`);
        const lastAlertAt = (_a = deviationAlertAt.get(market.id)) !== null && _a !== void 0 ? _a : 0;
        if (Date.now() - lastAlertAt >= DEVIATION_ALERT_COOLDOWN_MS) {
            deviationAlertAt.set(market.id, Date.now());
            await db_1.models.aiMarketMakerHistory.create({
                marketMakerId: market.id,
                action: "CONFIG_CHANGE",
                details: { field: "PRICE_DEVIATION_ALERT", previousValue: targetPrice, newValue: externalPrice, note: `Deviation: ${deviation.toFixed(2)}% for ${symbol}` },
                priceAtAction: targetPrice,
                poolValueAtAction: 0,
            });
        }
    }
    return alerts;
}
async function fetchExternalPrice(symbol) {
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
        return cached.price;
    }
    const missedAt = unavailableSymbols.get(symbol);
    if (missedAt && Date.now() - missedAt < UNAVAILABLE_SYMBOL_TTL)
        return null;
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
            unavailableSymbols.delete(symbol);
            return price;
        }
        unavailableSymbols.set(symbol, Date.now());
        return null;
    }
    catch (error) {
        unavailableSymbols.set(symbol, Date.now());
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
const RETENTION_BATCH = 5000;
const RETENTION_MAX_PASSES = 200;
const RETENTION_MIN_DAYS = 2;
async function getHistoryRetentionDays() {
    const raw = await cache_1.CacheManager.getInstance().getSetting("aiMarketMakerHistoryRetentionDays");
    if (raw === undefined || raw === null || raw === "")
        return 90;
    const days = Number(raw);
    if (!Number.isFinite(days) || days <= 0)
        return null;
    return Math.max(days, RETENTION_MIN_DAYS);
}
async function processAiHistoryRetention() {
    const cronName = "processAiHistoryRetention";
    const startTime = Date.now();
    try {
        broadcastStatus(cronName, "running");
        broadcastLog(cronName, "Starting AI History Retention");
        const days = await getHistoryRetentionDays();
        if (days === null) {
            broadcastLog(cronName, "Retention is set to keep everything (0 days); nothing pruned", "info");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const cutoff = new Date(Date.now() - days * 86400000);
        broadcastLog(cronName, `Pruning per-trade history older than ${cutoff.toISOString()} (${days} day window)`);
        let tradesDeleted = 0;
        for (let pass = 0; pass < RETENTION_MAX_PASSES; pass++) {
            const n = await db_1.models.aiMarketMakerHistory.destroy({
                where: { action: "TRADE", createdAt: { [sequelize_1.Op.lt]: cutoff } },
                limit: RETENTION_BATCH,
            });
            tradesDeleted += n;
            broadcastProgress(cronName, Math.min(90, Math.round((pass / RETENTION_MAX_PASSES) * 100)));
            if (n < RETENTION_BATCH)
                break;
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        let alertsDeleted = 0;
        for (let pass = 0; pass < RETENTION_MAX_PASSES; pass++) {
            const candidates = (await db_1.models.aiMarketMakerHistory.findAll({
                where: { action: "CONFIG_CHANGE", createdAt: { [sequelize_1.Op.lt]: cutoff } },
                attributes: ["id", "details"],
                limit: RETENTION_BATCH,
                order: [["createdAt", "ASC"]],
                raw: true,
            }));
            if (!candidates.length)
                break;
            const ids = candidates
                .filter((row) => parseHistoryDetails(row.details).field === "PRICE_DEVIATION_ALERT")
                .map((row) => row.id);
            if (ids.length) {
                alertsDeleted += await db_1.models.aiMarketMakerHistory.destroy({
                    where: { id: { [sequelize_1.Op.in]: ids } },
                });
            }
            if (candidates.length < RETENTION_BATCH)
                break;
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        broadcastProgress(cronName, 100);
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
        broadcastLog(cronName, `AI History Retention completed. Pruned ${tradesDeleted} trade rows and ${alertsDeleted} price-deviation alerts older than ${days} days`, "success");
    }
    catch (error) {
        console_1.logger.error("AI_RETENTION", "AI History Retention failed", error);
        broadcastStatus(cronName, "failed");
        throw error;
    }
}
