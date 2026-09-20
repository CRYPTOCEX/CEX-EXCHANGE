"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalPriceSync = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const redis = redis_1.RedisSingleton.getInstance();
const PRICE_CACHE_TTL = 5;
class ExternalPriceSync {
    constructor() {
        this.exchangeManager = exchange_1.default;
    }
    async getExternalPrice(symbol) {
        var _a, _b;
        const cacheKey = `external_price:${symbol}`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return parseFloat(cached);
            }
        }
        catch (error) {
        }
        try {
            const exchange = await this.exchangeManager.startExchange();
            if (!exchange) {
                console_1.logger.debug("AI_MM", "No exchange provider available for external price");
                return null;
            }
            const ticker = await exchange.fetchTicker(symbol);
            if (!ticker || !ticker.last) {
                console_1.logger.debug("AI_MM", `No ticker data for ${symbol}`);
                return null;
            }
            const price = ticker.last;
            try {
                await redis.set(cacheKey, price.toString(), "EX", PRICE_CACHE_TTL);
            }
            catch (cacheError) {
            }
            return price;
        }
        catch (error) {
            if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("not found")) ||
                ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("does not exist"))) {
                console_1.logger.debug("AI_MM", `Symbol ${symbol} not found on exchange`);
            }
            else {
                console_1.logger.error("AI_MM", `Error fetching external price for ${symbol}`, error);
            }
            return null;
        }
    }
    calculateGravityEffect(currentPrice, externalPrice, correlationStrength) {
        const divergence = ((externalPrice - currentPrice) / currentPrice) * 100;
        const strength = correlationStrength / 100;
        const divergenceMultiplier = Math.min(Math.abs(divergence) / 10, 1);
        const pullStrength = strength * divergenceMultiplier;
        const targetPrice = currentPrice * (1 - pullStrength) + externalPrice * pullStrength;
        return {
            targetPrice,
            pullStrength,
            divergence,
            externalPrice,
        };
    }
    smoothPriceTransition(currentPrice, targetPrice, maxStepPercent = 0.5) {
        const diff = targetPrice - currentPrice;
        const maxStep = currentPrice * (maxStepPercent / 100);
        if (Math.abs(diff) <= maxStep) {
            return targetPrice;
        }
        const step = diff > 0 ? maxStep : -maxStep;
        return currentPrice + step;
    }
    async getGravityAdjustedTarget(currentPrice, externalSymbol, correlationStrength) {
        const externalPrice = await this.getExternalPrice(externalSymbol);
        if (!externalPrice) {
            return null;
        }
        return this.calculateGravityEffect(currentPrice, externalPrice, correlationStrength);
    }
    async isSymbolAvailable(symbol) {
        const cacheKey = `symbol_available:${symbol}`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached !== null) {
                return cached === "1";
            }
        }
        catch (error) {
        }
        try {
            const exchange = await this.exchangeManager.startExchange();
            if (!exchange) {
                return false;
            }
            if (!exchange.markets) {
                await exchange.loadMarkets();
            }
            const available = symbol in exchange.markets;
            try {
                await redis.set(cacheKey, available ? "1" : "0", "EX", 3600);
            }
            catch (cacheError) {
            }
            return available;
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Error checking symbol availability for ${symbol}`, error);
            return false;
        }
    }
    async getAvailableSymbols() {
        try {
            const exchange = await this.exchangeManager.startExchange();
            if (!exchange) {
                return [];
            }
            if (!exchange.markets) {
                await exchange.loadMarkets();
            }
            return Object.keys(exchange.markets || {});
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Error fetching available symbols", error);
            return [];
        }
    }
    calculateCorrelation(priceHistory) {
        if (priceHistory.length < 2)
            return 0;
        const n = priceHistory.length;
        const internals = priceHistory.map((p) => p.internal);
        const externals = priceHistory.map((p) => p.external);
        const meanInternal = internals.reduce((a, b) => a + b, 0) / n;
        const meanExternal = externals.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let sumSqInternal = 0;
        let sumSqExternal = 0;
        for (let i = 0; i < n; i++) {
            const diffInternal = internals[i] - meanInternal;
            const diffExternal = externals[i] - meanExternal;
            numerator += diffInternal * diffExternal;
            sumSqInternal += diffInternal * diffInternal;
            sumSqExternal += diffExternal * diffExternal;
        }
        const denominator = Math.sqrt(sumSqInternal * sumSqExternal);
        if (denominator === 0)
            return 0;
        return numerator / denominator;
    }
    mapToExchangeSymbol(internalSymbol) {
        const parts = internalSymbol.split("/");
        if (parts.length !== 2) {
            return internalSymbol;
        }
        return `${parts[0].toUpperCase()}/${parts[1].toUpperCase()}`;
    }
    async clearPriceCache(symbol) {
        try {
            await redis.del(`external_price:${symbol}`);
        }
        catch (error) {
        }
    }
    async clearAllCaches() {
        try {
            const keys = await redis.keys("external_price:*");
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Error clearing external price caches", error);
        }
    }
}
exports.ExternalPriceSync = ExternalPriceSync;
exports.default = ExternalPriceSync;
