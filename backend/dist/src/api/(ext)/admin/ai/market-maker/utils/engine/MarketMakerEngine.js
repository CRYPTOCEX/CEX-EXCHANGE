"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketMakerEngine = void 0;
const crypto_1 = require("crypto");
const os_1 = __importDefault(require("os"));
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const settings_bus_1 = require("@b/utils/settings-bus");
const engine_lease_1 = require("@b/utils/engine-lease");
const console_1 = require("@b/utils/console");
const client_1 = require("../scylla/client");
const MarketManager_1 = require("./MarketManager");
const StrategyManager_1 = require("./strategies/StrategyManager");
const RiskManager_1 = require("./risk/RiskManager");
const RealizedPnLReconciler_1 = require("./risk/RealizedPnLReconciler");
const PoolManager_1 = require("./pool/PoolManager");
const cache_1 = require("@b/utils/cache");
const redis = redis_1.RedisSingleton.getInstance();
const DEFAULT_CONFIG = {
    tickIntervalMs: 1000,
    maxConcurrentMarkets: 10,
    enableRealLiquidity: true,
    emergencyStopEnabled: true,
};
function isPidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return (error === null || error === void 0 ? void 0 : error.code) === "EPERM";
    }
}
class MarketMakerEngine {
    constructor() {
        this.status = "STOPPED";
        this.config = DEFAULT_CONFIG;
        this.tickInterval = null;
        this.lastTickTime = null;
        this.tickCount = 0;
        this.errorCount = 0;
        this.startTime = null;
        this.marketManager = null;
        this.strategyManager = null;
        this.riskManager = null;
        this.pnlReconciler = new RealizedPnLReconciler_1.RealizedPnLReconciler();
        this.poolManager = null;
        this.instanceId = (0, crypto_1.randomUUID)();
        this.leaderRenewal = null;
        this.isLeader = false;
        this.exitHookInstalled = false;
        this.leaderArbitratedBy = "none";
        this.tickInProgress = false;
        this.consecutiveSlowTicks = 0;
        this.MAX_TICK_DURATION_MS = 5000;
    }
    static getInstance() {
        if (!MarketMakerEngine.instance) {
            MarketMakerEngine.instance = new MarketMakerEngine();
        }
        return MarketMakerEngine.instance;
    }
    leaderToken() {
        return `${os_1.default.hostname()}:${process.pid}:${this.instanceId}`;
    }
    ownsToken(holder) {
        if (!holder)
            return false;
        return holder === this.instanceId || holder === this.leaderToken();
    }
    async reclaimIfHolderDead(holder) {
        if (!holder)
            return false;
        const parts = holder.split(":");
        if (parts.length < 3)
            return false;
        const [host, pidText] = parts;
        if (host !== os_1.default.hostname())
            return false;
        const pid = Number(pidText);
        if (!Number.isInteger(pid) || pid <= 0)
            return false;
        if (pid === process.pid)
            return false;
        if (isPidAlive(pid))
            return false;
        try {
            const swapped = await redis.eval(`if redis.call('GET', KEYS[1]) == ARGV[1] then
           return redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
         end
         return nil`, 1, MarketMakerEngine.LEADER_KEY, holder, this.leaderToken(), String(MarketMakerEngine.LEADER_TTL_SECONDS));
            return swapped !== null;
        }
        catch (error) {
            console_1.logger.debug("AI_MM", "Could not reclaim a dead leader's key", error);
            return false;
        }
    }
    async acquireLeadership() {
        if (!(0, engine_lease_1.isEngineLeaseCandidate)(engine_lease_1.ENGINE_LEASE_KEYS.AI_MARKET_MAKER)) {
            (0, engine_lease_1.noteEngineRunsElsewhere)("AI_MM", "This process may not run the market maker engine (it is the dedicated cron process, " +
                "whose ecosystem matcher is read-only). The process holding the matcher runs it instead.", "warn");
            return false;
        }
        if ((0, engine_lease_1.isEngineLeaseFollower)(engine_lease_1.ENGINE_LEASE_KEYS.ECOSYSTEM_MATCHING)) {
            (0, engine_lease_1.noteEngineRunsElsewhere)("AI_MM", "This process's ecosystem matcher is a read-only follower, so bot orders placed here " +
                "would be refused; the market maker engine stays idle and follows the matcher.", "warn");
            return false;
        }
        let redisAnswered = false;
        try {
            const claimed = await redis.set(MarketMakerEngine.LEADER_KEY, this.leaderToken(), "EX", MarketMakerEngine.LEADER_TTL_SECONDS, "NX");
            if (claimed === null) {
                const holder = await redis.get(MarketMakerEngine.LEADER_KEY);
                if (this.ownsToken(holder)) {
                    await redis.expire(MarketMakerEngine.LEADER_KEY, MarketMakerEngine.LEADER_TTL_SECONDS);
                }
                else if (await this.reclaimIfHolderDead(holder)) {
                    console_1.logger.debug("AI_MM", `Reclaimed the market maker engine lease from a dead process (${holder}) on this host`);
                }
                else {
                    console_1.logger.warn("AI_MM", `Another process (${holder}) is running the market maker engine; this one will stay idle`);
                    return false;
                }
            }
            redisAnswered = true;
        }
        catch (error) {
            console_1.logger.debug("AI_MM", "Redis leadership check unavailable; deferring to the database lease", error);
        }
        const dbClaim = await this.acquireDbLease();
        if (dbClaim === false) {
            console_1.logger.warn("AI_MM", "Another process holds the market maker engine lease in the database; this one will stay idle");
            return false;
        }
        this.leaderArbitratedBy =
            redisAnswered ? "redis" : dbClaim === true ? "database" : "none";
        if (this.leaderArbitratedBy === "none") {
            (0, settings_bus_1.warnUnarbitratedMultiProcess)("AI_MM", "NOTHING is arbitrating market-maker leadership right now — neither Redis nor the database " +
                "lease row could be reached. Every process that starts this engine will believe it leads: " +
                "the price advances twice, the synthetic orderbook rebuilds race each other, and both " +
                "write the 1-minute candle that binary options settle on.");
        }
        this.isLeader = true;
        this.startLeadershipRenewal();
        this.installExitHook();
        return true;
    }
    async acquireDbLease() {
        try {
            const now = new Date();
            const claim = {
                instanceId: this.instanceId,
                hostname: os_1.default.hostname(),
                pid: process.pid,
                expiresAt: new Date(now.getTime() + MarketMakerEngine.LEADER_TTL_SECONDS * 1000),
            };
            const [taken] = await db_1.models.aiMarketMakerEngineLease.update(claim, {
                where: {
                    id: MarketMakerEngine.LEASE_ROW_ID,
                    [sequelize_1.Op.or]: [{ instanceId: this.instanceId }, { expiresAt: { [sequelize_1.Op.lte]: now } }],
                },
            });
            if (taken > 0)
                return true;
            const row = await db_1.models.aiMarketMakerEngineLease.findByPk(MarketMakerEngine.LEASE_ROW_ID);
            if (!row) {
                try {
                    await db_1.models.aiMarketMakerEngineLease.create({
                        id: MarketMakerEngine.LEASE_ROW_ID,
                        ...claim,
                    });
                    return true;
                }
                catch (error) {
                    if (String((error === null || error === void 0 ? void 0 : error.name) || "").includes("Unique"))
                        return false;
                    throw error;
                }
            }
            if (row.instanceId === this.instanceId)
                return true;
            if (row.hostname === os_1.default.hostname() && row.pid != null && !isPidAlive(row.pid)) {
                const [reclaimed] = await db_1.models.aiMarketMakerEngineLease.update(claim, {
                    where: { id: MarketMakerEngine.LEASE_ROW_ID, instanceId: row.instanceId },
                });
                if (reclaimed > 0) {
                    console_1.logger.debug("AI_MM", `Reclaimed the market maker engine lease from a dead process (pid ${row.pid} on ${row.hostname})`);
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            console_1.logger.debug("AI_MM", "Database leadership arbiter unavailable", error);
            return null;
        }
    }
    async releaseDbLease() {
        try {
            await db_1.models.aiMarketMakerEngineLease.destroy({
                where: { id: MarketMakerEngine.LEASE_ROW_ID, instanceId: this.instanceId },
            });
        }
        catch (error) {
            console_1.logger.debug("AI_MM", "Failed to release the database engine lease", error);
        }
    }
    installExitHook() {
        if (this.exitHookInstalled)
            return;
        this.exitHookInstalled = true;
        const release = () => {
            void this.releaseLeadership();
        };
        for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "beforeExit"]) {
            process.once(signal, release);
        }
    }
    startLeadershipRenewal() {
        var _a, _b;
        if (this.leaderRenewal)
            return;
        this.leaderRenewal = setInterval(async () => {
            try {
                const holder = await redis.get(MarketMakerEngine.LEADER_KEY);
                if (holder && !this.ownsToken(holder)) {
                    console_1.logger.error("AI_MM", `Lost market maker leadership to ${holder}; shutting this engine down`);
                    this.isLeader = false;
                    this.leaderArbitratedBy = "none";
                    await this.releaseDbLease();
                    await this.shutdown().catch(() => null);
                    return;
                }
                await redis.set(MarketMakerEngine.LEADER_KEY, this.leaderToken(), "EX", MarketMakerEngine.LEADER_TTL_SECONDS);
            }
            catch (_a) {
            }
            const dbClaim = await this.acquireDbLease();
            if (dbClaim === false) {
                console_1.logger.error("AI_MM", "Lost the market maker engine lease in the database; shutting this engine down");
                this.isLeader = false;
                this.leaderArbitratedBy = "none";
                await this.shutdown().catch(() => null);
            }
        }, (MarketMakerEngine.LEADER_TTL_SECONDS / 3) * 1000);
        (_b = (_a = this.leaderRenewal).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    async releaseLeadership() {
        if (this.leaderRenewal) {
            clearInterval(this.leaderRenewal);
            this.leaderRenewal = null;
        }
        if (!this.isLeader)
            return;
        this.isLeader = false;
        this.leaderArbitratedBy = "none";
        try {
            const holder = await redis.get(MarketMakerEngine.LEADER_KEY);
            if (this.ownsToken(holder)) {
                await redis.del(MarketMakerEngine.LEADER_KEY);
            }
        }
        catch (_a) {
        }
        await this.releaseDbLease();
    }
    isEngineLeader() {
        return this.isLeader;
    }
    async initialize(config) {
        if (this.status !== "STOPPED") {
            return;
        }
        this.status = "STARTING";
        try {
            this.config = { ...DEFAULT_CONFIG, ...config };
            const mobileAppEnabled = await cache_1.CacheManager.getInstance().getSettingBool("mobileAppEnabled", false);
            if (mobileAppEnabled) {
                this.status = "STOPPED";
                console_1.logger.warn("AI_MM", "Engine refused to start: this platform ships a mobile app " +
                    "(mobileAppEnabled). Synthetic order-book depth and a published app " +
                    "cannot coexist — an app store reads fabricated liquidity as " +
                    "deceptive and removes the live app. Turn off the mobile app " +
                    "setting to run the market maker.");
                return;
            }
            if (!(await this.acquireLeadership())) {
                this.status = "STOPPED";
                return;
            }
            await (0, client_1.initializeAiMarketMakerTables)();
            await this.loadGlobalSettings();
            this.marketManager = new MarketManager_1.MarketManager(this);
            this.strategyManager = new StrategyManager_1.StrategyManager();
            this.riskManager = new RiskManager_1.RiskManager(this);
            this.poolManager = new PoolManager_1.PoolManager();
            await this.marketManager.loadActiveMarkets();
            this.status = "RUNNING";
            this.startTime = new Date();
            this.errorCount = 0;
            this.startTickLoop();
            await this.publishStatus();
        }
        catch (error) {
            this.status = "ERROR";
            console_1.logger.error("AI_MM", "Failed to initialize engine", error);
            throw error;
        }
    }
    async shutdown() {
        if (this.status === "STOPPED") {
            console_1.logger.warn("AI_MM", "Engine is already stopped");
            return;
        }
        this.status = "STOPPING";
        console_1.logger.warn("AI_MM", "Shutting down Market Maker Engine...");
        try {
            this.stopTickLoop();
            if (this.marketManager) {
                await this.marketManager.releaseAllMarkets();
            }
            this.marketManager = null;
            this.strategyManager = null;
            this.riskManager = null;
            this.poolManager = null;
            this.status = "STOPPED";
            this.startTime = null;
            await this.releaseLeadership();
            console_1.logger.success("AI_MM", "Market Maker Engine shut down successfully");
            await this.publishStatus();
        }
        catch (error) {
            this.status = "ERROR";
            console_1.logger.error("AI_MM", "Failed to shutdown Market Maker Engine", error);
            throw error;
        }
    }
    async emergencyStop() {
        console_1.logger.error("AI_MM", "EMERGENCY STOP TRIGGERED");
        this.stopTickLoop();
        if (this.marketManager) {
            await this.marketManager.emergencyStopAllMarkets();
        }
        this.status = "STOPPED";
        await this.releaseLeadership();
        await this.logHistory("EMERGENCY_STOP", {
            reason: "Manual emergency stop triggered",
            timestamp: new Date().toISOString(),
        });
        await this.publishStatus();
    }
    async ensureRunning() {
        if (this.status === "RUNNING")
            return true;
        if (this.status === "STARTING" || this.status === "STOPPING")
            return false;
        try {
            if (this.status === "ERROR")
                this.status = "STOPPED";
            await this.initialize(this.config);
            return this.getStatus().status === "RUNNING";
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Failed to bring the engine back up", error);
            return false;
        }
    }
    getStatus() {
        var _a, _b, _c;
        var _d, _e;
        return {
            status: this.status,
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : null,
            tickCount: this.tickCount,
            errorCount: this.errorCount,
            activeMarkets: ((_a = this.marketManager) === null || _a === void 0 ? void 0 : _a.getActiveMarketCount()) || 0,
            errorPausedMarkets: (_d = (_b = this.marketManager) === null || _b === void 0 ? void 0 : _b.getErrorPausedMarkets()) !== null && _d !== void 0 ? _d : [],
            pausedMarkets: (_e = (_c = this.marketManager) === null || _c === void 0 ? void 0 : _c.getPausedMarkets()) !== null && _e !== void 0 ? _e : [],
            config: this.config,
            instanceId: this.instanceId,
            isLeader: this.isLeader,
            leaderArbitratedBy: this.leaderArbitratedBy,
        };
    }
    getMarketManager() {
        return this.marketManager;
    }
    getStrategyManager() {
        return this.strategyManager;
    }
    getRiskManager() {
        return this.riskManager;
    }
    getPoolManager() {
        return this.poolManager;
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console_1.logger.info("AI_MM", `Configuration updated: ${JSON.stringify(this.config)}`);
    }
    async loadGlobalSettings() {
        try {
            const cacheManager = cache_1.CacheManager.getInstance();
            const [maxConcurrentBots, tradingEnabled, maintenanceMode, globalPauseEnabled,] = await Promise.all([
                cacheManager.getSetting("aiMarketMakerMaxConcurrentBots"),
                cacheManager.getSetting("aiMarketMakerEnabled"),
                cacheManager.getSetting("aiMarketMakerMaintenanceMode"),
                cacheManager.getSetting("aiMarketMakerGlobalPauseEnabled"),
            ]);
            this.config.maxConcurrentMarkets = maxConcurrentBots || 50;
            this.config.enableRealLiquidity = tradingEnabled !== false;
            if (maintenanceMode || globalPauseEnabled) {
                console_1.logger.warn("AI_MM", "Global pause or maintenance mode is enabled");
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Failed to load global settings", error);
        }
    }
    async reconcileRealizedPnL() {
        var _a;
        var _b;
        if (!this.riskManager || !this.marketManager)
            return;
        try {
            for (const marketMakerId of this.marketManager.getMarketIds()) {
                const delta = await this.pnlReconciler.reconcile(marketMakerId);
                if (delta === null)
                    continue;
                const instance = this.marketManager.getMarketInstance(marketMakerId);
                const marketId = (_b = (_a = instance === null || instance === void 0 ? void 0 : instance.getMarketId) === null || _a === void 0 ? void 0 : _a.call(instance)) !== null && _b !== void 0 ? _b : marketMakerId;
                await this.riskManager.reportTradeResult(marketId, delta, delta < 0);
            }
        }
        catch (error) {
            console_1.logger.debug("AI_MM", "Realised P&L reconciliation failed", error);
        }
    }
    forgetMarketState(marketMakerId) {
        var _a;
        this.pnlReconciler.forget(marketMakerId);
        (_a = this.poolManager) === null || _a === void 0 ? void 0 : _a.forget(marketMakerId);
    }
    getTickIntervalMs() {
        return this.config.tickIntervalMs;
    }
    startTickLoop() {
        if (this.tickInterval) {
            return;
        }
        this.tickInterval = setInterval(async () => {
            await this.tick();
        }, this.config.tickIntervalMs);
    }
    stopTickLoop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
            console_1.logger.info("AI_MM", "Tick loop stopped");
        }
    }
    async tick() {
        var _a;
        if (this.status !== "RUNNING") {
            return;
        }
        if (this.tickInProgress) {
            this.consecutiveSlowTicks++;
            if (this.consecutiveSlowTicks > 10) {
                console_1.logger.warn("AI_MM", `Warning: ${this.consecutiveSlowTicks} consecutive slow ticks detected`);
            }
            return;
        }
        this.tickInProgress = true;
        const tickStart = Date.now();
        this.tickCount++;
        this.lastTickTime = new Date();
        if (process.env.NODE_ENV === "development" && this.tickCount % 30 === 0) {
            console_1.logger.debug("AI_MM", `Tick #${this.tickCount} | Markets: ${((_a = this.marketManager) === null || _a === void 0 ? void 0 : _a.getActiveMarketCount()) || 0} | Errors: ${this.errorCount}`);
        }
        try {
            let tradingAllowed = true;
            if (this.riskManager) {
                const riskCheck = await this.riskManager.checkGlobalRisk();
                if (!riskCheck.canTrade) {
                    tradingAllowed = false;
                    if (this.tickCount % 60 === 0) {
                        console_1.logger.warn("AI_MM", `Trading paused: ${riskCheck.reason}`);
                    }
                }
            }
            if (this.marketManager) {
                const processPromise = this.marketManager.processAllMarkets(tradingAllowed);
                processPromise.catch(() => { });
                let timeoutHandle;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutHandle = setTimeout(() => reject(new Error("Market processing timeout")), this.MAX_TICK_DURATION_MS);
                });
                try {
                    await Promise.race([processPromise, timeoutPromise]);
                }
                finally {
                    clearTimeout(timeoutHandle);
                }
            }
            if (this.tickCount % 60 === 0) {
                await this.performPeriodicTasks();
                await this.reconcileRealizedPnL();
            }
            this.consecutiveSlowTicks = 0;
        }
        catch (error) {
            this.errorCount++;
            if ((error === null || error === void 0 ? void 0 : error.message) === "Market processing timeout") {
                console_1.logger.error("AI_MM", `Tick timeout - processing took > ${this.MAX_TICK_DURATION_MS}ms`);
            }
            else {
                console_1.logger.error("AI_MM", "Tick processing error", error);
            }
            if (this.errorCount > 100 && this.config.emergencyStopEnabled) {
                await this.emergencyStop();
            }
            if (this.tickCount % 60 === 0) {
                try {
                    await this.performPeriodicTasks();
                }
                catch (sweepError) {
                    console_1.logger.warn("AI_MM", "Periodic maintenance failed after a tick error; resting orders may not have " +
                        "been swept this minute.", sweepError);
                }
            }
        }
        finally {
            this.tickInProgress = false;
            const tickDuration = Date.now() - tickStart;
            if (tickDuration > this.config.tickIntervalMs * 2) {
                console_1.logger.warn("AI_MM", `Slow tick detected: ${tickDuration}ms (expected < ${this.config.tickIntervalMs}ms)`);
            }
        }
    }
    async performPeriodicTasks() {
        var _a;
        await this.checkDailyVolumeReset();
        if (this.poolManager) {
            if (this.marketManager) {
                for (const marketMakerId of this.marketManager.getMarketIds()) {
                    this.poolManager.getBalanceTracker(marketMakerId);
                    const instance = this.marketManager.getMarketInstance(marketMakerId);
                    const price = (_a = instance === null || instance === void 0 ? void 0 : instance.getCurrentPriceNumber) === null || _a === void 0 ? void 0 : _a.call(instance);
                    if (typeof price === "number" && Number.isFinite(price) && price > 0) {
                        this.poolManager.updateCurrentPrice(marketMakerId, price);
                    }
                }
            }
            await this.poolManager.updateAllBalances();
            if (this.marketManager) {
                for (const marketMakerId of this.marketManager.getMarketIds()) {
                    try {
                        const tracker = this.poolManager.getBalanceTracker(marketMakerId);
                        const instance = this.marketManager.getMarketInstance(marketMakerId);
                        if (!tracker || !(instance === null || instance === void 0 ? void 0 : instance.applyPoolBalances))
                            continue;
                        instance.applyPoolBalances(await tracker.getBalance());
                    }
                    catch (error) {
                        console_1.logger.debug("AI_MM", `Could not refresh pool balances for ${marketMakerId}`, error);
                    }
                }
            }
        }
        if (this.marketManager) {
            await this.marketManager.cleanupExpiredOrders();
        }
        await this.publishStatus();
    }
    async checkDailyVolumeReset() {
        var _a, _b;
        try {
            const now = new Date();
            const lastResetKey = "ai_market_maker:last_daily_reset";
            const lastResetStr = await redis.get(lastResetKey);
            const lastResetDate = lastResetStr ? new Date(lastResetStr) : null;
            const today = now.toISOString().split("T")[0];
            const lastResetDay = lastResetDate === null || lastResetDate === void 0 ? void 0 : lastResetDate.toISOString().split("T")[0];
            if (lastResetDay !== today) {
                console_1.logger.info("AI_MM", "Performing daily volume reset...");
                await db_1.models.aiMarketMaker.update({ currentDailyVolume: 0 }, { where: {} });
                await db_1.models.aiBot.update({ dailyTradeCount: 0 }, { where: {} });
                if (this.marketManager) {
                    await this.marketManager.refreshAllMarkets();
                    for (const marketMakerId of this.marketManager.getMarketIds()) {
                        (_a = this.marketManager
                            .getMarketInstance(marketMakerId)) === null || _a === void 0 ? void 0 : _a.resetOrderFlowSessions(now.getTime());
                    }
                }
                (_b = this.riskManager) === null || _b === void 0 ? void 0 : _b.resetCircuitBreaker();
                await redis.set(lastResetKey, now.toISOString());
                console_1.logger.info("AI_MM", "Daily volume reset complete");
                await this.logHistory("DAILY_RESET", {
                    resetDate: today,
                    timestamp: now.toISOString(),
                });
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Failed to check daily volume reset", error);
        }
    }
    async publishStatus() {
        try {
            const status = this.getStatus();
            await redis.set("ai_market_maker:engine:status", JSON.stringify(status), "EX", 60);
        }
        catch (error) {
        }
    }
    async logHistory(action, details) {
        try {
            console_1.logger.info("AI_MM", `History: ${action} - ${JSON.stringify(details)}`);
        }
        catch (error) {
        }
    }
}
exports.MarketMakerEngine = MarketMakerEngine;
MarketMakerEngine.LEADER_KEY = "ai_market_maker:engine:leader";
MarketMakerEngine.LEADER_TTL_SECONDS = 20;
MarketMakerEngine.LEASE_ROW_ID = "engine";
exports.default = MarketMakerEngine.getInstance();
