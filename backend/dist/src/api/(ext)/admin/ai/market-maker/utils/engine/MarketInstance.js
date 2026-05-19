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
exports.MarketInstance = void 0;
const console_1 = require("@b/utils/console");
const PriceTracker_1 = require("./PriceTracker");
const OrderManager_1 = require("./OrderManager");
const TradeExecutor_1 = require("./TradeExecutor");
const queries_1 = require("../scylla/queries");
const volatility_1 = require("./volatility");
const trend_1 = require("./trend");
const external_1 = require("./external");
class MarketInstance {
    constructor(engine, makerData) {
        this.status = "INITIALIZING";
        this.currentPrice = BigInt(0);
        this.simulatedPrice = BigInt(0);
        this.lastProcessTime = null;
        this.processCount = 0;
        this.errorCount = 0;
        this.dailyVolumeLimitLogged = false;
        this.phaseInitialized = false;
        this.recentPriceChanges = [];
        this.MAX_CUMULATIVE_CHANGE_PERCENT = 3.0;
        this.PRICE_CHANGE_WINDOW_MS = 60 * 1000;
        this.engine = engine;
        this.config = this.parseConfig(makerData);
        this.priceTracker = new PriceTracker_1.PriceTracker(this.config.symbol, this.config.marketId);
        this.orderManager = new OrderManager_1.OrderManager(this.config, engine);
        this.tradeExecutor = new TradeExecutor_1.TradeExecutor(this.config, this.orderManager);
        this.volatilityEngine = new volatility_1.VolatilityEngine();
        this.momentumTracker = new volatility_1.MomentumTracker();
        this.trendManager = new trend_1.TrendManager();
        this.externalPriceSync = new external_1.ExternalPriceSync();
        if (this.config.trendMomentum !== 0 || this.config.lastMomentumUpdate) {
            this.momentumTracker.setMomentum(this.config.id, this.config.trendMomentum, this.config.lastMomentumUpdate || undefined);
        }
    }
    parseConfig(makerData) {
        var _a;
        const symbol = makerData.market
            ? `${makerData.market.currency}/${makerData.market.pair}`
            : "UNKNOWN/UNKNOWN";
        return {
            id: makerData.id,
            marketId: makerData.marketId,
            symbol,
            status: makerData.status,
            targetPrice: parseFloat(makerData.targetPrice) || 0,
            priceRangeLow: parseFloat(makerData.priceRangeLow) || 0,
            priceRangeHigh: parseFloat(makerData.priceRangeHigh) || 0,
            aggressionLevel: makerData.aggressionLevel || "CONSERVATIVE",
            maxDailyVolume: parseFloat(makerData.maxDailyVolume) || 0,
            currentDailyVolume: parseFloat(makerData.currentDailyVolume) || 0,
            volatilityThreshold: parseFloat(makerData.volatilityThreshold) || 5,
            pauseOnHighVolatility: (_a = makerData.pauseOnHighVolatility) !== null && _a !== void 0 ? _a : true,
            realLiquidityPercent: parseFloat(makerData.realLiquidityPercent) || 0,
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
        };
    }
    async initialize() {
        try {
            await this.priceTracker.initialize();
            const lastCandlePrice = await (0, queries_1.getLastCandleClosePrice)(this.config.symbol);
            if (lastCandlePrice !== null && lastCandlePrice > 0) {
                this.currentPrice = BigInt(Math.floor(lastCandlePrice * 1e18));
                this.simulatedPrice = this.currentPrice;
                console_1.logger.info("AI_MM", `Using last candle close price for ${this.config.symbol}: ${lastCandlePrice}`);
            }
            else {
                this.currentPrice = await this.priceTracker.getCurrentPrice();
                if (this.currentPrice === BigInt(0) && this.config.targetPrice > 0) {
                    this.currentPrice = BigInt(Math.floor(this.config.targetPrice * 1e18));
                    console_1.logger.info("AI_MM", `No external price for ${this.config.symbol}, using target price: ${this.config.targetPrice}`);
                }
                this.simulatedPrice = this.currentPrice;
            }
            await (0, queries_1.clearOrderbookForSymbol)(this.config.symbol);
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
            const targetPrice = this.config.targetPrice;
            if (targetPrice <= 0) {
                console_1.logger.warn("AI_MM", `No target price for ${this.config.symbol}, cannot seed orderbook`);
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
            await (0, queries_1.syncOrderbookFromAiTrade)(this.config.symbol, targetPrice, baseOrderSize, "BUY");
            await (0, queries_1.syncCandlesFromAiTrade)(this.config.symbol, targetPrice, baseOrderSize);
            console_1.logger.success("AI_MM", `Seeded orderbook and candles for ${this.config.symbol} at ${targetPrice}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Orderbook seeding error", error);
            console_1.logger.warn("AI_MM", `Failed to seed orderbook for ${this.config.symbol}, continuing anyway`);
        }
    }
    async shutdown() {
        this.status = "STOPPED";
        await this.cancelAllOrders();
        this.priceTracker.cleanup();
    }
    async emergencyStop() {
        this.status = "STOPPED";
        await this.orderManager.cancelAllOrders();
    }
    async pause() {
        this.status = "PAUSED";
    }
    async resume() {
        this.status = "RUNNING";
    }
    async setTargetPrice(targetPrice, options) {
        const { persist = true, source = "EXTERNAL", updatePhaseTarget = false } = options || {};
        if (targetPrice <= 0 || !isFinite(targetPrice)) {
            console_1.logger.warn("AI_MM", `Invalid target price ${targetPrice} for ${this.config.symbol}, ignoring`);
            return;
        }
        const priceRangeLow = this.config.priceRangeLow;
        const priceRangeHigh = this.config.priceRangeHigh;
        if (priceRangeLow > 0 && priceRangeHigh > 0) {
            targetPrice = Math.max(priceRangeLow, Math.min(priceRangeHigh, targetPrice));
        }
        const oldTargetPrice = this.config.targetPrice;
        this.config.targetPrice = targetPrice;
        if (updatePhaseTarget) {
            this.config.phaseTargetPrice = targetPrice;
        }
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
    }
    updateConfig(makerData) {
        const newConfig = this.parseConfig(makerData);
        this.config = newConfig;
        console_1.logger.info("AI_MM", `Config updated for ${this.config.symbol}: dailyVolume=${this.config.currentDailyVolume}/${this.config.maxDailyVolume}`);
    }
    async cancelAllOrders() {
        await this.orderManager.cancelAllOrders();
    }
    async cleanupExpiredOrders() {
        await this.orderManager.cleanupExpiredOrders();
    }
    async process() {
        if (this.status !== "RUNNING") {
            return;
        }
        this.processCount++;
        this.lastProcessTime = new Date();
        try {
            await this.updatePrice();
            if (!this.shouldTrade()) {
                return;
            }
            const decision = await this.getStrategyDecision();
            if (decision.shouldAct) {
                await this.executeDecision(decision);
            }
            await this.recordPriceHistory();
        }
        catch (error) {
            this.errorCount++;
            console_1.logger.error("AI_MM", `Process error for ${this.config.symbol}`, error);
            if (this.errorCount > 10) {
                this.status = "PAUSED";
                console_1.logger.error("AI_MM", `Too many errors, pausing ${this.config.symbol}`);
            }
        }
    }
    async updatePrice() {
        const newPrice = await this.priceTracker.fetchExternalPrice();
        if (newPrice > BigInt(0)) {
            this.currentPrice = newPrice;
        }
    }
    shouldTrade() {
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
                console_1.logger.warn("AI_MM", `High volatility (${volatility}%), skipping ${this.config.symbol}`);
                return false;
            }
        }
        const tradeChance = this.getTradeChance();
        const roll = Math.random();
        const shouldTrade = roll < tradeChance;
        if (process.env.NODE_ENV === "development" && this.processCount % 10 === 0) {
            console_1.logger.debug("AI_MM", `${this.config.symbol} tick #${this.processCount}: chance=${(tradeChance * 100).toFixed(0)}%, roll=${(roll * 100).toFixed(0)}%, trade=${shouldTrade}`);
        }
        return shouldTrade;
    }
    getTradeChance() {
        switch (this.config.aggressionLevel) {
            case "AGGRESSIVE":
                return 0.3;
            case "MODERATE":
                return 0.15;
            case "CONSERVATIVE":
            default:
                return 0.05;
        }
    }
    async getStrategyDecision() {
        const currentPriceNum = Number(this.simulatedPrice) / 1e18;
        const priceRangeLow = this.config.priceRangeLow || this.config.targetPrice * 0.5;
        const priceRangeHigh = this.config.priceRangeHigh || this.config.targetPrice * 2.0;
        if (!this.phaseInitialized && !this.config.phaseStartedAt) {
            await this.initializePhase(currentPriceNum);
        }
        this.phaseInitialized = true;
        if (this.trendManager.shouldTransitionPhase(this.config.nextPhaseChangeAt)) {
            await this.executePhaseTransition(currentPriceNum);
        }
        const phaseContext = this.trendManager.getPhaseContext(this.config.currentPhase, this.config.lastKnownPrice || currentPriceNum, this.config.phaseTargetPrice || this.config.targetPrice, this.config.phaseStartedAt, this.config.nextPhaseChangeAt);
        let externalGravity;
        if (this.config.priceMode !== "AUTONOMOUS" && this.config.externalSymbol) {
            const gravityEffect = await this.externalPriceSync.getGravityAdjustedTarget(currentPriceNum, this.config.externalSymbol, this.config.correlationStrength);
            if (gravityEffect) {
                externalGravity = {
                    price: gravityEffect.externalPrice,
                    strength: this.config.priceMode === "FOLLOW_EXTERNAL"
                        ? this.config.correlationStrength / 100
                        : (this.config.correlationStrength / 100) * 0.5,
                };
            }
        }
        const currentMomentum = this.momentumTracker.getCurrentMomentum(this.config.id);
        const movement = this.volatilityEngine.calculatePriceMovement(this.config.id, currentPriceNum, {
            baseVolatility: this.config.baseVolatility,
            volatilityMultiplier: this.config.volatilityMultiplier,
            momentumDecay: this.config.momentumDecay,
        }, phaseContext, currentMomentum, externalGravity);
        const momentumEvent = this.momentumTracker.checkForMomentumEvent(this.config.id, {
            eventProbability: 0.0005,
            minMagnitude: this.config.baseVolatility * 0.5,
            maxMagnitude: this.config.baseVolatility * 2,
        });
        let newPrice = movement.newPrice;
        if (momentumEvent) {
            const eventEffect = momentumEvent.magnitude / 100;
            newPrice = newPrice * (1 + eventEffect);
            console_1.logger.debug("AI_MM", `Momentum event for ${this.config.symbol}: ${momentumEvent.type} | magnitude: ${momentumEvent.magnitude.toFixed(2)}%`);
            this.logMomentumEvent(momentumEvent);
        }
        const maxTickChange = 0.005;
        if (currentPriceNum > 0) {
            const maxNewPrice = currentPriceNum * (1 + maxTickChange);
            const minNewPrice = currentPriceNum * (1 - maxTickChange);
            newPrice = Math.max(minNewPrice, Math.min(maxNewPrice, newPrice));
        }
        const actualChangePercent = ((newPrice - currentPriceNum) / currentPriceNum) * 100;
        newPrice = this.applyCumulativePriceLimit(newPrice, currentPriceNum, actualChangePercent);
        newPrice = Math.max(priceRangeLow, Math.min(priceRangeHigh, newPrice));
        this.simulatedPrice = BigInt(Math.floor(newPrice * 1e18));
        const finalChangePercent = ((newPrice - currentPriceNum) / currentPriceNum) * 100;
        this.trackPriceChange(finalChangePercent);
        this.momentumTracker.updateMomentum(this.config.id, movement.direction, Math.abs(movement.percentChange), this.config.momentumDecay);
        if (this.processCount % 30 === 0) {
            console_1.logger.debug("AI_MM", `${this.config.symbol}: ${movement.direction} | price: ${newPrice.toFixed(6)} | phase: ${this.config.currentPhase} | momentum: ${movement.momentum.toFixed(3)}`);
        }
        return {
            shouldAct: true,
            direction: movement.direction,
            targetPrice: newPrice,
            orderSize: this.calculateOrderSize(),
        };
    }
    trackPriceChange(changePercent) {
        const now = Date.now();
        this.recentPriceChanges.push({ timestamp: now, changePercent });
        const windowStart = now - this.PRICE_CHANGE_WINDOW_MS;
        this.recentPriceChanges = this.recentPriceChanges.filter((entry) => entry.timestamp >= windowStart);
    }
    applyCumulativePriceLimit(newPrice, currentPrice, proposedChangePercent) {
        const now = Date.now();
        const windowStart = now - this.PRICE_CHANGE_WINDOW_MS;
        let cumulativeChange = 0;
        for (const entry of this.recentPriceChanges) {
            if (entry.timestamp >= windowStart) {
                if ((entry.changePercent > 0 && proposedChangePercent > 0) ||
                    (entry.changePercent < 0 && proposedChangePercent < 0)) {
                    cumulativeChange += Math.abs(entry.changePercent);
                }
            }
        }
        const remainingRoom = Math.max(0, this.MAX_CUMULATIVE_CHANGE_PERCENT - cumulativeChange);
        const absProposedChange = Math.abs(proposedChangePercent);
        if (absProposedChange > remainingRoom) {
            const scaleFactor = remainingRoom / absProposedChange;
            const adjustedChangePercent = proposedChangePercent * scaleFactor;
            const adjustedPrice = currentPrice * (1 + adjustedChangePercent / 100);
            if (this.processCount % 60 === 0 && scaleFactor < 1) {
                console_1.logger.debug("AI_MM", `${this.config.symbol}: Price change limited by cumulative cap (${cumulativeChange.toFixed(2)}% in window, proposed ${proposedChangePercent.toFixed(2)}%)`);
            }
            return adjustedPrice;
        }
        return newPrice;
    }
    async initializePhase(currentPrice) {
        try {
            const result = await this.trendManager.initializePhase(this.config.id, currentPrice, this.config.marketBias, this.config.biasStrength);
            this.config.currentPhase = result.phase;
            this.config.phaseStartedAt = result.phaseStartedAt;
            this.config.nextPhaseChangeAt = result.nextPhaseChangeAt;
            this.config.phaseTargetPrice = result.phaseTargetPrice;
            this.config.lastKnownPrice = currentPrice;
            console_1.logger.info("AI_MM", `Initialized phase for ${this.config.symbol}: ${result.phase} | target: ${result.phaseTargetPrice.toFixed(6)}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to initialize phase for ${this.config.symbol}`, error);
        }
    }
    async executePhaseTransition(currentPrice) {
        try {
            const result = await this.trendManager.executePhaseTransition(this.config.id, currentPrice, this.config.currentPhase, this.config.marketBias, this.config.biasStrength);
            this.config.currentPhase = result.newPhase;
            this.config.phaseStartedAt = result.phaseStartedAt;
            this.config.nextPhaseChangeAt = result.nextPhaseChangeAt;
            this.config.phaseTargetPrice = result.phaseTargetPrice;
            this.config.volatilityMultiplier = this.trendManager.getVolatilityMultiplier(result.newPhase);
            this.config.lastKnownPrice = currentPrice;
            console_1.logger.info("AI_MM", `Phase transition for ${this.config.symbol}: -> ${result.newPhase} | duration: ${result.durationHours}h | target: ${result.phaseTargetPrice.toFixed(6)}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to execute phase transition for ${this.config.symbol}`, error);
        }
    }
    async logMomentumEvent(event) {
        var _a;
        try {
            const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
            await models.aiMarketMakerHistory.create({
                marketMakerId: this.config.id,
                action: "MOMENTUM_EVENT",
                details: {
                    eventType: event.type,
                    magnitude: event.magnitude,
                    eventDuration: event.duration / 1000,
                    triggeredBy: "SYSTEM",
                },
                priceAtAction: Number(this.simulatedPrice) / 1e18,
                poolValueAtAction: ((_a = this.config.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) || 0,
            });
        }
        catch (error) {
            console_1.logger.debug("AI_MM", "Failed to log momentum event", error);
        }
    }
    calculateStepSize(priceDiffPercent) {
        const absDiff = Math.abs(priceDiffPercent);
        let maxStep;
        switch (this.config.aggressionLevel) {
            case "AGGRESSIVE":
                maxStep = 0.5;
                break;
            case "MODERATE":
                maxStep = 0.2;
                break;
            case "CONSERVATIVE":
            default:
                maxStep = 0.1;
        }
        const step = Math.min(absDiff * 0.1, maxStep);
        const randomFactor = 0.8 + Math.random() * 0.4;
        return step * randomFactor;
    }
    calculateOrderSize() {
        const activeBots = this.config.bots.filter((b) => b.status === "ACTIVE");
        if (activeBots.length === 0) {
            return BigInt(0);
        }
        const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
        const orderSizeVariance = Math.min(bot.orderSizeVariance, 0.5);
        const variance = 1 - orderSizeVariance + Math.random() * orderSizeVariance * 2;
        let orderSize = bot.avgOrderSize * variance;
        if (this.config.pool && this.config.pool.baseCurrencyBalance > 0) {
            const baseBalance = this.config.pool.baseCurrencyBalance;
            const maxTradePercent = 0.05 + Math.random() * 0.1;
            const maxOrderSize = baseBalance * maxTradePercent;
            if (orderSize > maxOrderSize && this.config.realLiquidityPercent > 0) {
                orderSize = maxOrderSize;
            }
        }
        const minOrderSize = 0.001;
        if (orderSize < minOrderSize) {
            orderSize = minOrderSize;
        }
        if (orderSize < minOrderSize) {
            const targetPrice = this.config.targetPrice || 1;
            orderSize = Math.max(0.01, 10 / targetPrice);
        }
        return BigInt(Math.floor(orderSize * 1e18));
    }
    async executeDecision(decision) {
        if (!decision.shouldAct || !decision.direction || !decision.orderSize || !decision.targetPrice) {
            return;
        }
        const { aiAmount, realAmount } = (0, queries_1.calculateLiquiditySplit)(decision.orderSize, this.config.realLiquidityPercent);
        if (aiAmount > BigInt(0)) {
            await this.tradeExecutor.executeAiTrade({
                direction: decision.direction,
                amount: aiAmount,
                targetPrice: decision.targetPrice,
            });
        }
        if (realAmount > BigInt(0)) {
            await this.tradeExecutor.placeRealLiquidityOrder({
                direction: decision.direction,
                amount: realAmount,
                targetPrice: decision.targetPrice,
                volatility: this.priceTracker.getVolatility(),
            });
        }
    }
    async recordPriceHistory() {
        if (this.processCount % 10 !== 0) {
            return;
        }
        try {
            await (0, queries_1.insertPriceHistory)({
                marketId: this.config.marketId,
                price: this.currentPrice,
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
        return this.currentPrice;
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
exports.default = MarketInstance;
