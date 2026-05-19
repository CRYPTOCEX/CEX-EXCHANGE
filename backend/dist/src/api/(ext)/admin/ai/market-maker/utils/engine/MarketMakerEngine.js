"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketMakerEngine = void 0;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const client_1 = require("../scylla/client");
const MarketManager_1 = require("./MarketManager");
const StrategyManager_1 = require("./strategies/StrategyManager");
const RiskManager_1 = require("./risk/RiskManager");
const PoolManager_1 = require("./pool/PoolManager");
const cache_1 = require("@b/utils/cache");
const redis = redis_1.RedisSingleton.getInstance();
const DEFAULT_CONFIG = {
    tickIntervalMs: 1000,
    maxConcurrentMarkets: 10,
    enableRealLiquidity: true,
    emergencyStopEnabled: true,
};
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
        this.poolManager = null;
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
    async initialize(config) {
        if (this.status !== "STOPPED") {
            return;
        }
        this.status = "STARTING";
        try {
            this.config = { ...DEFAULT_CONFIG, ...config };
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
                await this.marketManager.stopAllMarkets();
            }
            this.marketManager = null;
            this.strategyManager = null;
            this.riskManager = null;
            this.poolManager = null;
            this.status = "STOPPED";
            this.startTime = null;
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
        await this.logHistory("EMERGENCY_STOP", {
            reason: "Manual emergency stop triggered",
            timestamp: new Date().toISOString(),
        });
        await this.publishStatus();
    }
    getStatus() {
        var _a;
        return {
            status: this.status,
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : null,
            tickCount: this.tickCount,
            errorCount: this.errorCount,
            activeMarkets: ((_a = this.marketManager) === null || _a === void 0 ? void 0 : _a.getActiveMarketCount()) || 0,
            config: this.config,
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
            if (this.riskManager) {
                const riskCheck = await this.riskManager.checkGlobalRisk();
                if (!riskCheck.canTrade) {
                    if (this.tickCount % 60 === 0) {
                        console_1.logger.warn("AI_MM", `Trading paused: ${riskCheck.reason}`);
                    }
                    return;
                }
            }
            if (this.marketManager) {
                const processPromise = this.marketManager.processAllMarkets();
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Market processing timeout")), this.MAX_TICK_DURATION_MS));
                await Promise.race([processPromise, timeoutPromise]);
            }
            if (this.tickCount % 60 === 0) {
                await this.performPeriodicTasks();
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
        await this.checkDailyVolumeReset();
        if (this.poolManager) {
            await this.poolManager.updateAllBalances();
        }
        if (this.marketManager) {
            await this.marketManager.cleanupExpiredOrders();
        }
        await this.publishStatus();
    }
    async checkDailyVolumeReset() {
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
                }
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
exports.default = MarketMakerEngine.getInstance();
