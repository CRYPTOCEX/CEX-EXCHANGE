"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketInstance = exports.maxRestingRealOrders = void 0;
const console_1 = require("@b/utils/console");
const PriceTracker_1 = require("./PriceTracker");
const OrderManager_1 = require("./OrderManager");
const TradeExecutor_1 = require("./TradeExecutor");
const closeAuthority_1 = require("../scylla/closeAuthority");
const queries_1 = require("../scylla/queries");
const volatility_1 = require("./volatility");
const external_1 = require("./external");
const quote_premium_1 = require("./quote-premium");
const OrderManager_2 = require("./OrderManager");
const resting_limits_1 = require("./resting-limits");
const requote_plan_1 = require("./requote-plan");
const bots_1 = require("../bots");
const market_resolver_1 = require("../venue/market-resolver");
const MAX_DIRECTIONAL_EDGE = 0.015;
const MAX_STEERING_EDGE = 0.06;
const STEERING_HORIZON_MS = 5 * 60000;
var resting_limits_2 = require("./resting-limits");
Object.defineProperty(exports, "maxRestingRealOrders", { enumerable: true, get: function () { return resting_limits_2.maxRestingRealOrders; } });
class MarketInstance {
    constructor(engine, makerData) {
        this.status = "INITIALIZING";
        this.warnedOnce = new Set();
        this.externalPriceSync = new external_1.ExternalPriceSync();
        this.lastReportedPhase = null;
        this.lastStatePersistMs = 0;
        this.lastHeartbeatMs = 0;
        this.lastOrderbookAmount = 0;
        this.externalGravity = null;
        this.lastExternalFetchMs = 0;
        this.lastExternalPriceMs = 0;
        this.externalMovePercent = 0;
        this.lastRequoteMs = 0;
        this.currentPrice = BigInt(0);
        this.simulatedPrice = BigInt(0);
        this.lastProcessTime = null;
        this.processCount = 0;
        this.errorCount = 0;
        this.consecutiveErrors = 0;
        this.errorPausedAtMs = 0;
        this.errorPauseUntilMs = 0;
        this.errorPauseLevel = 0;
        this.lastErrorMessage = "";
        this.lastErrorLogMs = 0;
        this.suppressedErrors = 0;
        this.simulatedPriceAtLastTrade = BigInt(0);
        this.dailyVolumeLimitLogged = false;
        this.engine = engine;
        this.config = this.parseConfig(makerData);
        this.priceTracker = new PriceTracker_1.PriceTracker(this.config.symbol, this.config.marketId);
        this.orderManager = new OrderManager_1.OrderManager(this.config, engine);
        this.tradeExecutor = new TradeExecutor_1.TradeExecutor(this.config, this.orderManager);
        this.priceProcess = this.buildPriceProcess();
        const seed = (0, volatility_1.parseEntropySeed)(this.config.entropySeed, this.config.id);
        this.orderFlow = new bots_1.OrderFlow(seed.hi, seed.lo);
        this.orderFlow.setBots(this.config.bots, Date.now());
    }
    warnOnce(key, message) {
        if (this.warnedOnce.has(key))
            return;
        this.warnedOnce.add(key);
        console_1.logger.warn("AI_MM", message);
    }
    buildPriceProcess() {
        const seed = (0, volatility_1.parseEntropySeed)(this.config.entropySeed, this.config.id);
        return new volatility_1.PriceProcess(seed.hi, seed.lo, this.buildPriceConfig(), this.config.priceEngineState);
    }
    buildPriceConfig() {
        var _a;
        var _b;
        const band = (0, external_1.resolveFollowBand)({
            priceMode: this.config.priceMode,
            externalPrice: (_b = (_a = this.externalGravity) === null || _a === void 0 ? void 0 : _a.price) !== null && _b !== void 0 ? _b : null,
            targetPrice: this.config.targetPrice,
            priceRangeLow: this.config.priceRangeLow,
            priceRangeHigh: this.config.priceRangeHigh,
        });
        return {
            anchorPrice: band.anchorPrice,
            baseVolatilityPercent: this.config.baseVolatility,
            volatilityMultiplier: this.config.volatilityMultiplier,
            priceRangeLow: band.priceRangeLow,
            priceRangeHigh: band.priceRangeHigh,
            bias: this.config.marketBias,
            biasStrength: this.config.biasStrength,
            forcedPhase: this.getActiveForcedPhase(),
            maxDirectionalEdge: MAX_DIRECTIONAL_EDGE,
            maxSteeringEdge: MAX_STEERING_EDGE,
            externalGravity: this.externalGravity,
        };
    }
    getActiveForcedPhase() {
        var _a;
        const expiry = this.config.nextPhaseChangeAt;
        if (!expiry || expiry.getTime() <= Date.now())
            return null;
        const planned = (_a = this.priceProcess) === null || _a === void 0 ? void 0 : _a.getPlanner().getPlannedPhaseAt(Date.now());
        if (!planned)
            return null;
        return this.config.currentPhase !== planned ? this.config.currentPhase : null;
    }
    parseConfig(makerData) {
        var _a;
        var _b, _c;
        const symbol = makerData.market
            ? (0, market_resolver_1.marketSymbol)(makerData.market.currency, makerData.market.pair)
            : "UNKNOWN/UNKNOWN";
        return {
            id: makerData.id,
            marketId: makerData.marketId,
            marketType: (0, market_resolver_1.normaliseVenue)(makerData.marketType),
            futuresLeverage: Number(makerData.futuresLeverage) >= 1
                ? Number(makerData.futuresLeverage)
                : 1,
            marketMetadata: (_b = (_a = makerData.market) === null || _a === void 0 ? void 0 : _a.metadata) !== null && _b !== void 0 ? _b : null,
            symbol,
            status: makerData.status,
            targetPrice: parseFloat(makerData.targetPrice) || 0,
            priceRangeLow: parseFloat(makerData.priceRangeLow) || 0,
            priceRangeHigh: parseFloat(makerData.priceRangeHigh) || 0,
            aggressionLevel: makerData.aggressionLevel || "CONSERVATIVE",
            maxDailyVolume: parseFloat(makerData.maxDailyVolume) || 0,
            currentDailyVolume: parseFloat(makerData.currentDailyVolume) || 0,
            volatilityThreshold: parseFloat(makerData.volatilityThreshold) || 5,
            pauseOnHighVolatility: (_c = makerData.pauseOnHighVolatility) !== null && _c !== void 0 ? _c : true,
            realLiquidityPercent: parseFloat(makerData.realLiquidityPercent) || 0,
            requoteFloorPerSide: makerData.requoteFloorPerSide === null ||
                makerData.requoteFloorPerSide === undefined
                ? undefined
                : Number(makerData.requoteFloorPerSide),
            maxRestingRealOrders: makerData.maxRestingRealOrders === null ||
                makerData.maxRestingRealOrders === undefined
                ? undefined
                : Number(makerData.maxRestingRealOrders),
            pool: makerData.pool
                ? {
                    baseCurrencyBalance: parseFloat(makerData.pool.baseCurrencyBalance) || 0,
                    quoteCurrencyBalance: parseFloat(makerData.pool.quoteCurrencyBalance) || 0,
                    totalValueLocked: parseFloat(makerData.pool.totalValueLocked) || 0,
                }
                : null,
            bots: (makerData.bots || []).map((bot) => ({
                id: bot.id,
                name: bot.name,
                personality: bot.personality,
                riskTolerance: parseFloat(bot.riskTolerance) || 0.5,
                tradeFrequency: bot.tradeFrequency || "MEDIUM",
                avgOrderSize: parseFloat(bot.avgOrderSize) || 0,
                orderSizeVariance: parseFloat(bot.orderSizeVariance) || 0.2,
                preferredSpread: parseFloat(bot.preferredSpread) || 0.001,
                status: bot.status,
                lastTradeAt: bot.lastTradeAt,
                dailyTradeCount: bot.dailyTradeCount || 0,
                maxDailyTrades: bot.maxDailyTrades || 100,
            })),
            priceMode: makerData.priceMode || "AUTONOMOUS",
            externalSymbol: makerData.externalSymbol || null,
            correlationStrength: parseFloat(makerData.correlationStrength) || 50,
            marketBias: makerData.marketBias || "NEUTRAL",
            biasStrength: parseFloat(makerData.biasStrength) || 50,
            currentPhase: makerData.currentPhase || "ACCUMULATION",
            phaseStartedAt: makerData.phaseStartedAt ? new Date(makerData.phaseStartedAt) : null,
            nextPhaseChangeAt: makerData.nextPhaseChangeAt ? new Date(makerData.nextPhaseChangeAt) : null,
            phaseTargetPrice: makerData.phaseTargetPrice ? parseFloat(makerData.phaseTargetPrice) : null,
            baseVolatility: parseFloat(makerData.baseVolatility) || 2.0,
            volatilityMultiplier: parseFloat(makerData.volatilityMultiplier) || 1.0,
            momentumDecay: parseFloat(makerData.momentumDecay) || 0.95,
            lastKnownPrice: makerData.lastKnownPrice ? parseFloat(makerData.lastKnownPrice) : null,
            trendMomentum: parseFloat(makerData.trendMomentum) || 0,
            lastMomentumUpdate: makerData.lastMomentumUpdate ? new Date(makerData.lastMomentumUpdate) : null,
            entropySeed: makerData.entropySeed || null,
            priceEngineState: makerData.priceEngineState || null,
        };
    }
    async initialize() {
        try {
            await this.priceTracker.initialize();
            const lastCandlePrice = await (0, queries_1.getLastCandleClosePrice)(this.config.symbol, this.config.marketType);
            await this.ensureEntropySeed();
            if (lastCandlePrice !== null && lastCandlePrice > 0) {
                this.currentPrice = this.toBigInt(lastCandlePrice);
                this.simulatedPrice = this.currentPrice;
                console_1.logger.info("AI_MM", `Using last candle close price for ${this.config.symbol}: ${lastCandlePrice}`);
            }
            else {
                this.currentPrice = await this.priceTracker.getCurrentPrice();
                if (this.currentPrice === BigInt(0) && this.config.targetPrice > 0) {
                    this.currentPrice = this.toBigInt(this.config.targetPrice);
                    console_1.logger.info("AI_MM", `No external price for ${this.config.symbol}, using target price: ${this.config.targetPrice}`);
                }
                this.simulatedPrice = this.currentPrice;
            }
            const startPrice = Number(this.simulatedPrice) / 1e18;
            if (!this.config.priceEngineState && startPrice > 0) {
                this.priceProcess.seedAtPrice(startPrice, Date.now());
            }
            this.simulatedPriceAtLastTrade = this.simulatedPrice;
            this.priceProcess.setConfig(this.buildPriceConfig());
            this.lastReportedPhase = this.priceProcess
                .getPlanner()
                .getStateAt(Date.now()).phase;
            const adequacy = this.priceProcess.getRangeAdequacy();
            if (!adequacy.adequate) {
                console_1.logger.warn("AI_MM", `${this.config.symbol}: price range is only ${adequacy.sigmas.toFixed(2)} sigma wide ` +
                    `for a ${this.config.baseVolatility}%/day market. Widen the range or lower ` +
                    `baseVolatility, or price will be predictable near the bounds.`);
            }
            await (0, queries_1.clearOrderbookForSymbol)(this.config.symbol, this.config.marketType);
            await (0, closeAuthority_1.releaseSettlementClaims)(this.config.symbol);
            const deletedOrders = await (0, queries_1.deleteAiBotOrdersByMarket)(this.config.marketId);
            if (deletedOrders > 0) {
                console_1.logger.debug("AI_MM", `Cleaned up ${deletedOrders} old AI bot orders for ${this.config.symbol}`);
            }
            await this.orderManager.initialize();
            await this.seedOrderbook();
            this.status = "RUNNING";
            console_1.logger.success("AI_MM", `Market instance initialized: ${this.config.symbol}`);
        }
        catch (error) {
            this.status = "ERROR";
            console_1.logger.error("AI_MM", "Market instance initialization error", error);
            throw error;
        }
    }
    async seedOrderbook() {
        try {
            const activeBots = this.config.bots.filter(b => b.status === "ACTIVE");
            if (activeBots.length === 0) {
                console_1.logger.warn("AI_MM", `No active bots for ${this.config.symbol}, cannot seed orderbook`);
                return;
            }
            const livePrice = Number(this.simulatedPrice) / 1e18;
            const targetPrice = livePrice > 0 ? livePrice : this.config.targetPrice;
            if (!(targetPrice > 0) || !isFinite(targetPrice)) {
                console_1.logger.warn("AI_MM", `No usable price for ${this.config.symbol}, cannot seed orderbook`);
                return;
            }
            console_1.logger.debug("AI_MM", `Seeding orderbook for ${this.config.symbol} around target price ${targetPrice}`);
            let baseOrderSize = activeBots.reduce((sum, b) => sum + b.avgOrderSize, 0) / activeBots.length;
            if (baseOrderSize <= 0) {
                baseOrderSize = Math.max(0.1, 100 / targetPrice);
            }
            if (this.config.pool && this.config.pool.baseCurrencyBalance > 0) {
                const maxFromPool = this.config.pool.baseCurrencyBalance * 0.1;
                baseOrderSize = Math.min(baseOrderSize, maxFromPool);
            }
            this.lastOrderbookAmount = baseOrderSize;
            await (0, queries_1.syncOrderbookFromAiTrade)(this.config.symbol, targetPrice, baseOrderSize, "BUY", this.config.marketType);
            console_1.logger.success("AI_MM", `Seeded orderbook and candles for ${this.config.symbol} at ${targetPrice}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Orderbook seeding error", error);
            console_1.logger.warn("AI_MM", `Failed to seed orderbook for ${this.config.symbol}, continuing anyway`);
        }
    }
    registerFillSink() {
        this.orderManager.registerFillSink();
    }
    dispose() {
        this.orderManager.disposeFillSink();
    }
    async shutdown() {
        this.status = "STOPPED";
        this.dispose();
        await this.cancelAllOrders();
        await this.clearPublishedOrderbook();
        this.priceTracker.cleanup();
    }
    async emergencyStop() {
        this.status = "STOPPED";
        this.dispose();
        await this.orderManager.cancelAllOrders();
        await this.clearPublishedOrderbook();
    }
    async clearPublishedOrderbook() {
        this.lastOrderbookAmount = 0;
        try {
            await (0, queries_1.clearOrderbookForSymbol)(this.config.symbol, this.config.marketType);
            console_1.logger.info("AI_MM", `Cleared synthetic orderbook levels for ${this.config.symbol}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to clear orderbook for ${this.config.symbol}; levels will expire via TTL`, error);
        }
    }
    async pause() {
        this.errorPausedAtMs = 0;
        this.status = "PAUSED";
        await this.orderManager.cancelAllOrders();
    }
    async resume() {
        this.consecutiveErrors = 0;
        this.errorPausedAtMs = 0;
        this.errorPauseUntilMs = 0;
        this.errorPauseLevel = 0;
        this.status = "RUNNING";
    }
    async setTargetPrice(targetPrice, options) {
        var _a;
        var _b;
        const { persist = true, source = "EXTERNAL", updatePhaseTarget = false } = options || {};
        const requested = targetPrice;
        if (targetPrice <= 0 || !isFinite(targetPrice)) {
            console_1.logger.warn("AI_MM", `Invalid target price ${targetPrice} for ${this.config.symbol}, ignoring`);
            return {
                applied: false,
                requested,
                achieved: this.config.targetPrice,
                clamped: false,
            };
        }
        const activeBand = (0, external_1.resolveFollowBand)({
            priceMode: this.config.priceMode,
            externalPrice: (_b = (_a = this.externalGravity) === null || _a === void 0 ? void 0 : _a.price) !== null && _b !== void 0 ? _b : null,
            targetPrice: this.config.targetPrice,
            priceRangeLow: this.config.priceRangeLow,
            priceRangeHigh: this.config.priceRangeHigh,
        });
        const priceRangeLow = activeBand.priceRangeLow;
        const priceRangeHigh = activeBand.priceRangeHigh;
        if (priceRangeLow > 0 && priceRangeHigh > 0) {
            targetPrice = Math.max(priceRangeLow, Math.min(priceRangeHigh, targetPrice));
        }
        const clamped = targetPrice !== requested;
        if (clamped) {
            console_1.logger.warn("AI_MM", `Target ${requested} for ${this.config.symbol} clamped to ${targetPrice} ` +
                `by configured range [${priceRangeLow}, ${priceRangeHigh}] (source: ${source})`);
        }
        const oldTargetPrice = this.config.targetPrice;
        this.config.targetPrice = targetPrice;
        if (updatePhaseTarget) {
            this.config.phaseTargetPrice = targetPrice;
        }
        this.priceProcess.setSteering(targetPrice, STEERING_HORIZON_MS);
        this.priceProcess.setConfig(this.buildPriceConfig());
        console_1.logger.debug("AI_MM", `Target price updated for ${this.config.symbol}: ${oldTargetPrice} -> ${targetPrice} (source: ${source})`);
        if (persist) {
            try {
                const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
                const updateData = { targetPrice };
                if (updatePhaseTarget) {
                    updateData.phaseTargetPrice = targetPrice;
                }
                await models.aiMarketMaker.update(updateData, {
                    where: { id: this.config.id },
                });
            }
            catch (error) {
                console_1.logger.error("AI_MM", `Failed to persist target price for ${this.config.symbol}`, error);
            }
        }
        return { applied: true, requested, achieved: targetPrice, clamped };
    }
    applyPoolBalances(balances) {
        if (!this.config.pool)
            return;
        const base = Number(balances.baseCurrency);
        const quote = Number(balances.quoteCurrency);
        const tvl = Number(balances.totalValueLocked);
        if (Number.isFinite(base) && base >= 0)
            this.config.pool.baseCurrencyBalance = base;
        if (Number.isFinite(quote) && quote >= 0)
            this.config.pool.quoteCurrencyBalance = quote;
        if (Number.isFinite(tvl) && tvl >= 0)
            this.config.pool.totalValueLocked = tvl;
    }
    updateConfig(makerData) {
        var _a;
        const newConfig = this.parseConfig(makerData);
        newConfig.priceEngineState = this.priceProcess.getState();
        newConfig.entropySeed = (_a = newConfig.entropySeed) !== null && _a !== void 0 ? _a : this.config.entropySeed;
        Object.assign(this.config, newConfig);
        this.priceProcess.setConfig(this.buildPriceConfig());
        console_1.logger.info("AI_MM", `Config updated for ${this.config.symbol}: dailyVolume=${this.config.currentDailyVolume}/${this.config.maxDailyVolume}`);
    }
    async ensureEntropySeed() {
        if (this.config.entropySeed && /^[0-9a-fA-F]{16}$/.test(this.config.entropySeed)) {
            return;
        }
        try {
            const { randomBytes } = await Promise.resolve().then(() => __importStar(require("crypto")));
            const seed = randomBytes(8).toString("hex");
            const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
            await models.aiMarketMaker.update({ entropySeed: seed }, { where: { id: this.config.id } });
            this.config.entropySeed = seed;
            this.priceProcess = this.buildPriceProcess();
            console_1.logger.info("AI_MM", `Generated entropy seed for ${this.config.symbol}`);
        }
        catch (error) {
            console_1.logger.warn("AI_MM", `Could not persist entropy seed for ${this.config.symbol}; using derived seed`, error);
        }
    }
    async cancelAllOrders() {
        await this.orderManager.cancelAllOrders();
    }
    async cleanupExpiredOrders() {
        const gravity = this.hasFreshReference(Date.now()) ? this.externalGravity : null;
        const reference = gravity && gravity.price > 0
            ? this.toBigInt(gravity.price)
            : this.getCurrentPrice();
        const margin = gravity
            ? (0, quote_premium_1.quotePremium)({
                observedMovePercent: this.externalMovePercent,
                observationWindowMs: MarketInstance.EXTERNAL_REFRESH_INTERVAL_MS,
                quoteLifetimeMs: MarketInstance.STALE_SWEEP_HORIZON_MS,
                maxPremiumFraction: MarketInstance.MAX_STALE_MARGIN_FRACTION,
            }).premiumFraction
            : 0;
        await this.orderManager.cleanupExpiredOrders(reference, margin);
    }
    async process(tradingAllowed = true) {
        if (this.status !== "RUNNING") {
            this.tryAutoRecover();
            return;
        }
        this.processCount++;
        const now = Date.now();
        this.lastProcessTime = new Date(now);
        try {
            this.advancePrice(now);
            await this.recordPriceHistory();
            await this.persistEngineState(now);
            await this.refreshExternalGravity(now);
            const gatesPass = tradingAllowed && this.passesTradeGates();
            const decision = gatesPass ? this.buildFlowDecision(now) : null;
            if (!decision) {
                await this.publishPriceHeartbeat(now);
            }
            else {
                await this.executeDecision(decision, now);
            }
            await this.maybeRequote(now, gatesPass);
            this.consecutiveErrors = 0;
            this.errorPauseLevel = 0;
        }
        catch (error) {
            this.consecutiveErrors++;
            this.errorCount++;
            this.logProcessError(error);
            if (this.consecutiveErrors >= MarketInstance.MAX_CONSECUTIVE_ERRORS) {
                const cooldownMs = this.errorPauseCooldownMs();
                this.status = "PAUSED";
                this.errorPausedAtMs = Date.now();
                this.errorPauseUntilMs = this.errorPausedAtMs + cooldownMs;
                const firstOfIncident = this.errorPauseLevel === 0;
                this.errorPauseLevel = Math.min(this.errorPauseLevel + 1, MarketInstance.MAX_ERROR_PAUSE_LEVEL);
                console_1.logger.error("AI_MM", `${this.config.symbol}: ${this.consecutiveErrors} consecutive errors, pausing ` +
                    `for ${Math.round(cooldownMs / 1000)}s (${this.lastErrorMessage})`);
                if (firstOfIncident) {
                    void this.recordErrorPause(cooldownMs);
                }
            }
        }
    }
    logProcessError(error) {
        const message = error instanceof Error ? error.message : String(error);
        const nowMs = Date.now();
        const isNewFault = message !== this.lastErrorMessage;
        if (!isNewFault &&
            nowMs - this.lastErrorLogMs < MarketInstance.ERROR_LOG_INTERVAL_MS) {
            this.suppressedErrors++;
            return;
        }
        const suppressed = this.suppressedErrors;
        const sinceMs = this.lastErrorLogMs > 0 ? nowMs - this.lastErrorLogMs : 0;
        this.lastErrorMessage = message;
        this.lastErrorLogMs = nowMs;
        this.suppressedErrors = 0;
        const summary = suppressed > 0
            ? ` (${suppressed} identical failures suppressed in the last ` +
                `${Math.round(sinceMs / 1000)}s)`
            : "";
        console_1.logger.error("AI_MM", `Process error for ${this.config.symbol}${summary}`, error);
    }
    async recordErrorPause(cooldownMs) {
        var _a;
        try {
            const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
            await models.aiMarketMakerHistory.create({
                marketMakerId: this.config.id,
                action: "AUTO_PAUSE",
                details: {
                    reason: "ENGINE_ERRORS",
                    triggeredBy: "SYSTEM",
                    note: `The engine stopped ticking ${this.config.symbol} after ` +
                        `${this.consecutiveErrors} consecutive failed ticks and will retry at ` +
                        `${new Date(this.errorPauseUntilMs).toISOString()} ` +
                        `(${Math.round(cooldownMs / 1000)}s). The market maker's status column ` +
                        `still reads ${this.config.status}: this is an engine-level pause, not an ` +
                        `operator one. Last failure: ${this.lastErrorMessage || "unknown"}`,
                },
                priceAtAction: Number(this.simulatedPrice) / 1e18,
                poolValueAtAction: ((_a = this.config.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) || 0,
            });
        }
        catch (error) {
            console_1.logger.debug("AI_MM", "Failed to record the engine error pause", error);
        }
    }
    errorPauseCooldownMs() {
        return MarketInstance.ERROR_PAUSE_COOLDOWN_MS * (1 << this.errorPauseLevel);
    }
    isErrorPaused() {
        return this.status === "PAUSED" && this.errorPausedAtMs !== 0;
    }
    getErrorPauseState() {
        const errorPaused = this.isErrorPaused();
        return {
            errorPaused,
            since: errorPaused ? new Date(this.errorPausedAtMs).toISOString() : null,
            retryAt: errorPaused ? new Date(this.errorPauseUntilMs).toISOString() : null,
            level: this.errorPauseLevel,
            atMaxBackoff: this.errorPauseLevel >= MarketInstance.MAX_ERROR_PAUSE_LEVEL,
            lastError: this.lastErrorMessage || null,
            consecutiveErrors: this.consecutiveErrors,
        };
    }
    maybeAutoRecover() {
        this.tryAutoRecover();
    }
    passesTradeGates() {
        const activeBots = this.config.bots.filter((b) => b.status === "ACTIVE");
        if (activeBots.length < 2) {
            if (this.processCount % 60 === 0) {
                console_1.logger.warn("AI_MM", `Need at least 2 active bots for ${this.config.symbol}, have: ${activeBots.length}`);
            }
            return false;
        }
        if (this.config.realLiquidityPercent > 0) {
            if (!this.config.pool || this.config.pool.totalValueLocked <= 0) {
                if (this.processCount % 60 === 0) {
                    console_1.logger.warn("AI_MM", `Real liquidity enabled but no pool for ${this.config.symbol}`);
                }
                return false;
            }
        }
        if (this.config.maxDailyVolume > 0 && this.config.currentDailyVolume >= this.config.maxDailyVolume) {
            if (!this.dailyVolumeLimitLogged) {
                console_1.logger.warn("AI_MM", `Daily volume limit reached for ${this.config.symbol}: ${this.config.currentDailyVolume}/${this.config.maxDailyVolume}`);
                this.dailyVolumeLimitLogged = true;
            }
            return false;
        }
        this.dailyVolumeLimitLogged = false;
        if (this.config.pauseOnHighVolatility) {
            const volatility = this.priceTracker.getVolatility();
            if (volatility > this.config.volatilityThreshold) {
                if (this.processCount % 60 === 0) {
                    console_1.logger.warn("AI_MM", `High volatility (${volatility.toFixed(2)}%), skipping ${this.config.symbol}`);
                }
                return false;
            }
        }
        return true;
    }
    tryAutoRecover() {
        if (this.status !== "PAUSED" || this.errorPausedAtMs === 0)
            return;
        if (Date.now() < this.errorPauseUntilMs)
            return;
        this.errorPausedAtMs = 0;
        this.errorPauseUntilMs = 0;
        this.consecutiveErrors = 0;
        this.status = "RUNNING";
        console_1.logger.warn("AI_MM", `${this.config.symbol}: auto-resuming after error pause cooldown`);
    }
    advancePrice(nowMs) {
        const step = this.priceProcess.advanceTo(nowMs);
        if (!isFinite(step.price) || step.price <= 0) {
            console_1.logger.error("AI_MM", `Price process produced an invalid price for ${this.config.symbol} (${step.price}); reseeding`);
            const fallback = this.config.targetPrice > 0 ? this.config.targetPrice : 1;
            this.priceProcess.seedAtPrice(fallback, nowMs);
            this.simulatedPrice = this.toBigInt(fallback);
            return;
        }
        this.simulatedPrice = this.toBigInt(step.price);
        this.priceTracker.observeEnginePrice(this.simulatedPrice);
        const planPhase = step.plan.phase;
        if (planPhase !== this.lastReportedPhase) {
            const previous = this.lastReportedPhase;
            this.lastReportedPhase = planPhase;
            this.config.currentPhase = planPhase;
            if (previous !== null && this.getActiveForcedPhase() === null) {
                void this.onPhaseChanged(previous, planPhase, step.price, step.plan);
            }
        }
        this.config.lastKnownPrice = step.price;
    }
    toBigInt(price) {
        const safe = Math.min(Math.max(price, 1e-12), 1e12);
        return BigInt(Math.floor(safe * 1e18));
    }
    buildFlowDecision(nowMs) {
        var _a, _b;
        var _c;
        const previous = Number(this.simulatedPriceAtLastTrade) / 1e18;
        const current = Number(this.simulatedPrice) / 1e18;
        const direction = current >= previous ? "BUY" : "SELL";
        this.orderFlow.setBots(this.config.bots, nowMs);
        return this.orderFlow.decide(this.config.bots, {
            direction,
            aggression: this.config.aggressionLevel,
            tickMs: (_c = (_b = (_a = this.engine).getTickIntervalMs) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : 1000,
            nowMs,
            minSize: MarketInstance.MIN_ORDER_SIZE,
            maxSize: this.poolOrderCeiling(direction),
        });
    }
    resetOrderFlowSessions(nowMs) {
        this.orderFlow.resetSessions(nowMs);
    }
    getMarketId() {
        return this.config.marketId;
    }
    poolOrderCeiling(direction) {
        if (this.config.realLiquidityPercent <= 0)
            return null;
        const pool = this.config.pool;
        if (!pool)
            return null;
        const owed = this.orderManager.restingRealNotional();
        if (direction === "SELL") {
            const base = Number(pool.baseCurrencyBalance);
            if (!Number.isFinite(base) || base <= 0)
                return 0;
            const spare = base - owed.base;
            if (!(spare > 0))
                return 0;
            return spare * MarketInstance.POOL_PRINT_FRACTION;
        }
        const quote = Number(pool.quoteCurrencyBalance);
        if (!Number.isFinite(quote) || quote <= 0)
            return 0;
        const spare = quote - owed.quote;
        if (!(spare > 0))
            return 0;
        const price = Number(this.simulatedPrice) / 1e18;
        if (!(price > 0) || !isFinite(price))
            return 0;
        return (spare * MarketInstance.POOL_PRINT_FRACTION) / price;
    }
    async onPhaseChanged(previousPhase, newPhase, price, plan) {
        var _a;
        try {
            const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
            await models.aiMarketMaker.update({
                currentPhase: newPhase,
                phaseStartedAt: new Date(),
                nextPhaseChangeAt: new Date(plan.chapterEndMs),
                lastKnownPrice: price,
            }, { where: { id: this.config.id } });
            await models.aiMarketMakerHistory.create({
                marketMakerId: this.config.id,
                action: "PHASE_CHANGE",
                details: {
                    previousPhase,
                    newPhase,
                    archetype: plan.archetype,
                    triggeredBy: "SYSTEM",
                },
                priceAtAction: price,
                poolValueAtAction: ((_a = this.config.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) || 0,
            });
            console_1.logger.info("AI_MM", `${this.config.symbol}: phase ${previousPhase} -> ${newPhase} (${plan.archetype})`);
        }
        catch (error) {
            console_1.logger.debug("AI_MM", "Failed to record phase change", error);
        }
    }
    async persistEngineState(nowMs) {
        if (nowMs - this.lastStatePersistMs < MarketInstance.STATE_PERSIST_INTERVAL_MS) {
            return;
        }
        this.lastStatePersistMs = nowMs;
        try {
            const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
            await models.aiMarketMaker.update({
                priceEngineState: this.priceProcess.getState(),
                priceEngineStateAt: new Date(nowMs),
                lastKnownPrice: Number(this.simulatedPrice) / 1e18,
            }, { where: { id: this.config.id } });
        }
        catch (error) {
            console_1.logger.debug("AI_MM", `Failed to persist engine state for ${this.config.symbol}`, error);
        }
    }
    async executeDecision(decision, nowMs) {
        var _a, _b;
        const targetPrice = Number(this.simulatedPrice) / 1e18;
        if (!(targetPrice > 0))
            return;
        let orderSize = BigInt(Math.floor(decision.size * 1e18));
        if (orderSize <= BigInt(0))
            return;
        const direction = decision.initiator.id === decision.buyBot.id ? "BUY" : "SELL";
        try {
            const riskManager = (_b = (_a = this.engine).getRiskManager) === null || _b === void 0 ? void 0 : _b.call(_a);
            if (riskManager) {
                const assessment = await riskManager.assessTradeRisk(this.config.marketId, direction, orderSize, this.toBigInt(targetPrice));
                if (!assessment.approved) {
                    console_1.logger.debug("AI_MM", `${this.config.symbol}: trade rejected by risk manager - ${assessment.reason}`);
                    return;
                }
                if (assessment.adjustedAmount && assessment.adjustedAmount > BigInt(0)) {
                    orderSize = assessment.adjustedAmount;
                }
            }
        }
        catch (error) {
            console_1.logger.debug("AI_MM", `Risk assessment unavailable for ${this.config.symbol}`, error);
        }
        const { aiAmount, realAmount } = (0, queries_1.calculateLiquiditySplit)(orderSize, this.config.realLiquidityPercent);
        let published = false;
        if (aiAmount > BigInt(0)) {
            published = await this.tradeExecutor.executeAiTrade({
                direction,
                amount: aiAmount,
                targetPrice,
                buyBotId: decision.buyBot.id,
                sellBotId: decision.sellBot.id,
            });
        }
        if (realAmount > BigInt(0)) {
            const resting = this.orderManager.getOpenOrderCount();
            const ceiling = (0, resting_limits_1.maxRestingRealOrders)(this.config);
            if (resting >= ceiling) {
                this.warnOnce("real-order-ceiling", `${this.config.symbol}: ${resting} real liquidity orders are already resting, at ` +
                    `the ceiling of ${ceiling}. No further real orders will be placed until some ` +
                    `fill or expire. This normally means quotes are not being cancelled — check ` +
                    `the expiry sweep, and raise maxRestingRealOrders only if this depth is intended.`);
            }
            else if (this.status !== "RUNNING") {
            }
            else {
                const placed = await this.tradeExecutor.placeRealLiquidityOrder({
                    direction,
                    amount: realAmount,
                    targetPrice,
                    volatility: this.priceTracker.getVolatility(),
                    referencePremiumFraction: this.referenceQuotePremium(),
                    botId: decision.initiator.id,
                });
                published = published || placed;
            }
        }
        if (published) {
            this.simulatedPriceAtLastTrade = this.simulatedPrice;
            this.orderFlow.onTraded(decision, nowMs);
        }
    }
    async maybeRequote(nowMs, gatesPass) {
        var _a, _b;
        if (!gatesPass)
            return;
        if (this.config.realLiquidityPercent <= 0)
            return;
        if (this.config.marketType === "FUTURES")
            return;
        if (this.config.priceMode === "AUTONOMOUS" || !this.config.externalSymbol)
            return;
        if (nowMs - this.lastRequoteMs < requote_plan_1.REQUOTE_INTERVAL_MS)
            return;
        if ((0, requote_plan_1.requoteFloorPerSide)(this.config) <= 0)
            return;
        if (!this.hasFreshReference(nowMs)) {
            this.warnOnce("requote-reference-stale", `${this.config.symbol}: not topping up real depth while the ` +
                `${this.config.externalSymbol} reference is stale. Quotes cannot be priced ` +
                `against a feed that has stopped answering, and the staleness sweep cannot ` +
                `retire them either. Check the exchange provider.`);
            return;
        }
        const priced = this.pricedReferencePremium();
        if (!priced)
            return;
        if (priced.capBound) {
            this.warnOnce("requote-premium-capped", `${this.config.symbol}: not topping up real depth while the honest spread for a ` +
                `${Math.round((0, OrderManager_2.realOrderLifetimeMs)(this.config) / 60000)}-minute quote against ` +
                `${this.config.externalSymbol} is ${(priced.honestFraction * 100).toFixed(2)}%, ` +
                `above the cap. Every quote written now is below its value, so replacing them ` +
                `on a schedule would lose money on a schedule. Depth returns on its own once ` +
                `the reference settles.`);
            return;
        }
        this.lastRequoteMs = nowMs;
        const targetPrice = Number(this.simulatedPrice) / 1e18;
        if (!(targetPrice > 0) || !isFinite(targetPrice))
            return;
        const activeBots = this.config.bots.filter((b) => b.status === "ACTIVE");
        const avgSize = activeBots.reduce((sum, b) => sum + (Number(b.avgOrderSize) || 0), 0) /
            Math.max(1, activeBots.length);
        const nominal = Number.isFinite(avgSize) && avgSize > 0 ? avgSize : MarketInstance.MIN_ORDER_SIZE;
        const realSizeFor = (direction) => (0, requote_plan_1.realQuoteSize)({
            nominal,
            ceiling: this.poolOrderCeiling(direction),
            minSize: MarketInstance.MIN_ORDER_SIZE,
            realLiquidityPercent: this.config.realLiquidityPercent,
            clamp: bots_1.clampOrderSize,
        });
        const buySize = realSizeFor("BUY");
        const sellSize = realSizeFor("SELL");
        const floorPerSide = (0, requote_plan_1.requoteFloorPerSide)(this.config);
        const resting = this.orderManager.restingRealCounts();
        const plan = (0, requote_plan_1.planRequote)({
            restingBuys: resting.buys,
            restingSells: resting.sells,
            trackedTotal: this.orderManager.getOpenOrderCount(),
            ceiling: (0, resting_limits_1.maxRestingRealOrders)(this.config),
            targetPerSide: floorPerSide,
            maxPerPass: requote_plan_1.REQUOTE_MAX_PER_PASS,
            canBuy: buySize > 0,
            canSell: sellSize > 0,
        });
        if (plan.buys === 0 && plan.sells === 0) {
            if (buySize <= 0 &&
                sellSize <= 0 &&
                (resting.buys < floorPerSide || resting.sells < floorPerSide)) {
                this.warnOnce("requote-pool-empty", `${this.config.symbol}: real depth is below its floor and the pool cannot back a ` +
                    `quote on either side. Top up the market maker pool, or set ` +
                    `realLiquidityPercent to 0 if this market is meant to be AI-only.`);
            }
            return;
        }
        const jobs = [];
        for (let i = 0; i < plan.buys; i++)
            jobs.push({ direction: "BUY", size: buySize });
        for (let i = 0; i < plan.sells; i++)
            jobs.push({ direction: "SELL", size: sellSize });
        const volatility = this.priceTracker.getVolatility();
        for (const job of jobs) {
            if (this.status !== "RUNNING")
                return;
            let size = job.size;
            try {
                const riskManager = (_b = (_a = this.engine).getRiskManager) === null || _b === void 0 ? void 0 : _b.call(_a);
                if (riskManager) {
                    const assessment = await riskManager.assessTradeRisk(this.config.marketId, job.direction, BigInt(Math.floor(size * 1e18)), this.toBigInt(targetPrice));
                    if (!assessment.approved) {
                        console_1.logger.debug("AI_MM", `${this.config.symbol}: re-quote rejected by risk manager - ${assessment.reason}`);
                        return;
                    }
                    if (assessment.adjustedAmount && assessment.adjustedAmount > BigInt(0)) {
                        size = Math.min(size, Number(assessment.adjustedAmount) / 1e18);
                    }
                }
            }
            catch (error) {
                console_1.logger.debug("AI_MM", `Risk assessment unavailable for ${this.config.symbol}`, error);
            }
            if (!(size > 0))
                continue;
            await this.tradeExecutor.placeRealLiquidityOrder({
                direction: job.direction,
                amount: BigInt(Math.floor(size * 1e18)),
                targetPrice,
                volatility,
                referencePremiumFraction: priced.premiumFraction,
            });
        }
    }
    referenceQuotePremium() {
        var _a;
        var _b;
        return (_b = (_a = this.pricedReferencePremium()) === null || _a === void 0 ? void 0 : _a.premiumFraction) !== null && _b !== void 0 ? _b : 0;
    }
    hasFreshReference(nowMs) {
        if (!this.externalGravity)
            return false;
        if (this.lastExternalPriceMs <= 0)
            return false;
        return nowMs - this.lastExternalPriceMs <= MarketInstance.REFERENCE_STALE_AFTER_MS;
    }
    pricedReferencePremium() {
        if (!this.externalGravity)
            return null;
        const priced = (0, quote_premium_1.quotePremium)({
            observedMovePercent: this.externalMovePercent,
            observationWindowMs: MarketInstance.EXTERNAL_REFRESH_INTERVAL_MS,
            quoteLifetimeMs: (0, OrderManager_2.realOrderLifetimeMs)(this.config),
            maxPremiumFraction: MarketInstance.MAX_REFERENCE_PREMIUM_FRACTION,
        });
        if (priced.capBound) {
            this.warnOnce("reference-premium-capped", `${this.config.symbol}: the honest spread for a ${Math.round((0, OrderManager_2.realOrderLifetimeMs)(this.config) / 60000)}-minute quote against ${this.config.externalSymbol} is ` +
                `${(priced.honestFraction * 100).toFixed(2)}%, above the ` +
                `${(MarketInstance.MAX_REFERENCE_PREMIUM_FRACTION * 100).toFixed(0)}% cap. ` +
                `Quotes are being written below their value; reduce realLiquidityPercent on ` +
                `this market until quotes can be repriced faster.`);
        }
        return priced;
    }
    async refreshExternalGravity(nowMs) {
        if (this.config.priceMode === "AUTONOMOUS" || !this.config.externalSymbol) {
            if (this.externalGravity !== null) {
                this.externalGravity = null;
                this.priceProcess.setConfig(this.buildPriceConfig());
            }
            return;
        }
        if (nowMs - this.lastExternalFetchMs < MarketInstance.EXTERNAL_REFRESH_INTERVAL_MS) {
            return;
        }
        this.lastExternalFetchMs = nowMs;
        try {
            const price = await this.externalPriceSync.getExternalPrice(this.config.externalSymbol);
            if (price === null || !isFinite(price) || price <= 0)
                return;
            const base = Math.max(0, Math.min(100, this.config.correlationStrength)) / 100;
            const strength = this.config.priceMode === "FOLLOW_EXTERNAL" ? base : base * 0.5;
            const previous = this.externalGravity;
            this.externalMovePercent *= MarketInstance.EXTERNAL_MOVE_DECAY;
            if (previous && previous.price > 0) {
                const movePercent = Math.abs(price / previous.price - 1) * 100;
                if (isFinite(movePercent)) {
                    this.externalMovePercent = Math.max(this.externalMovePercent, movePercent);
                }
            }
            this.externalGravity = { price, strength };
            this.lastExternalPriceMs = nowMs;
            this.priceProcess.setConfig(this.buildPriceConfig());
            if (!previous) {
                const edge = this.priceProcess.getTetherEdgeEstimate(3600);
                console_1.logger.warn("AI_MM", `${this.config.symbol}: tracking ${this.config.externalSymbol} at ` +
                    `${(strength * 100).toFixed(0)}% strength. A client watching both feeds has an ` +
                    `estimated ${(edge * 100).toFixed(1)}% directional edge on 1h bets while the ` +
                    `prices diverge. Use AUTONOMOUS for markets that settle binary options.`);
            }
        }
        catch (error) {
            console_1.logger.debug("AI_MM", `External price refresh failed for ${this.config.symbol}`, error);
        }
    }
    async publishPriceHeartbeat(nowMs) {
        if (nowMs - this.lastHeartbeatMs < MarketInstance.HEARTBEAT_INTERVAL_MS) {
            return;
        }
        this.lastHeartbeatMs = nowMs;
        const price = Number(this.simulatedPrice) / 1e18;
        if (!(price > 0) || !isFinite(price))
            return;
        try {
            await (0, queries_1.syncCandlesFromAiTrade)(this.config.symbol, price, 0, {
                venue: this.config.marketType,
            });
        }
        catch (error) {
            console_1.logger.debug("AI_MM", `Price heartbeat failed for ${this.config.symbol}`, error);
        }
        if (!(this.lastOrderbookAmount > 0))
            return;
        try {
            await (0, queries_1.syncOrderbookFromAiTrade)(this.config.symbol, price, this.lastOrderbookAmount, "BUY", this.config.marketType);
        }
        catch (error) {
            console_1.logger.debug("AI_MM", `Orderbook heartbeat refresh failed for ${this.config.symbol}`, error);
        }
    }
    async recordPriceHistory() {
        if (this.processCount % 10 !== 0) {
            return;
        }
        try {
            await (0, queries_1.insertPriceHistory)({
                marketId: this.config.marketId,
                price: this.simulatedPrice,
                volume: BigInt(0),
                isAiTrade: true,
                source: "AI",
            });
        }
        catch (error) {
        }
    }
    getStatus() {
        return this.status;
    }
    getConfig() {
        return { ...this.config };
    }
    getCurrentPrice() {
        return this.simulatedPrice > BigInt(0) ? this.simulatedPrice : this.currentPrice;
    }
    getCurrentPriceNumber() {
        return Number(this.getCurrentPrice()) / 1e18;
    }
    getPriceEngineDiagnostics() {
        return this.priceProcess.getDiagnostics();
    }
    getSymbol() {
        return this.config.symbol;
    }
    getStats() {
        return {
            processCount: this.processCount,
            errorCount: this.errorCount,
            lastProcessTime: this.lastProcessTime,
            currentPrice: (Number(this.currentPrice) / 1e18).toFixed(8),
        };
    }
}
exports.MarketInstance = MarketInstance;
MarketInstance.STATE_PERSIST_INTERVAL_MS = 120000;
MarketInstance.HEARTBEAT_INTERVAL_MS = 10000;
MarketInstance.MIN_ORDER_SIZE = 0.001;
MarketInstance.EXTERNAL_REFRESH_INTERVAL_MS = 15000;
MarketInstance.REFERENCE_STALE_AFTER_MS = 4 * MarketInstance.EXTERNAL_REFRESH_INTERVAL_MS;
MarketInstance.EXTERNAL_MOVE_DECAY = 0.8;
MarketInstance.MAX_REFERENCE_PREMIUM_FRACTION = 0.03;
MarketInstance.STALE_SWEEP_HORIZON_MS = 60000;
MarketInstance.MAX_STALE_MARGIN_FRACTION = 0.01;
MarketInstance.POOL_PRINT_FRACTION = 0.05;
MarketInstance.MAX_CONSECUTIVE_ERRORS = 20;
MarketInstance.ERROR_PAUSE_COOLDOWN_MS = 60000;
MarketInstance.MAX_ERROR_PAUSE_LEVEL = 5;
MarketInstance.ERROR_LOG_INTERVAL_MS = 60000;
exports.default = MarketInstance;
