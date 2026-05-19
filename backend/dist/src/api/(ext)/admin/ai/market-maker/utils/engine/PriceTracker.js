"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceTracker = void 0;
const console_1 = require("@b/utils/console");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const redis_1 = require("@b/utils/redis");
const queries_1 = require("../scylla/queries");
const redis = redis_1.RedisSingleton.getInstance();
const PRICE_CACHE_TTL = 5;
class PriceTracker {
    constructor(symbol, marketId) {
        this.currentPrice = BigInt(0);
        this.priceHistory = [];
        this.volatility = 0;
        this.lastFetchTime = null;
        this.high24h = BigInt(0);
        this.low24h = BigInt(0);
        this.volume24h = BigInt(0);
        this.symbolAvailableOnExchange = true;
        this.exchangeCheckDone = false;
        this.symbol = symbol;
        this.marketId = marketId;
    }
    async initialize() {
        try {
            await this.loadPriceHistory();
            await this.fetchExternalPrice();
            console_1.logger.info("AI_MM", `PriceTracker initialized for ${this.symbol}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", "PriceTracker initialization error", error);
            throw error;
        }
    }
    cleanup() {
        this.priceHistory = [];
    }
    async getCurrentPrice() {
        if (this.currentPrice > BigInt(0) && this.lastFetchTime) {
            const ageMs = Date.now() - this.lastFetchTime.getTime();
            if (ageMs < PRICE_CACHE_TTL * 1000) {
                return this.currentPrice;
            }
        }
        return this.fetchExternalPrice();
    }
    async fetchExternalPrice() {
        var _a;
        try {
            if (this.exchangeCheckDone && !this.symbolAvailableOnExchange) {
                return this.currentPrice;
            }
            const cached = await this.getCachedPrice();
            if (cached > BigInt(0)) {
                this.currentPrice = cached;
                this.lastFetchTime = new Date();
                return cached;
            }
            const exchange = await exchange_1.default.startExchange();
            if (!exchange) {
                this.symbolAvailableOnExchange = false;
                this.exchangeCheckDone = true;
                return this.currentPrice;
            }
            if (!this.exchangeCheckDone) {
                try {
                    await exchange.loadMarkets();
                    const markets = exchange.markets;
                    if (!markets || !markets[this.symbol]) {
                        this.symbolAvailableOnExchange = false;
                        this.exchangeCheckDone = true;
                        console_1.logger.info("AI_MM", `Symbol ${this.symbol} not available on exchange - using internal pricing only`);
                        return this.currentPrice;
                    }
                    this.exchangeCheckDone = true;
                }
                catch (marketError) {
                    this.symbolAvailableOnExchange = false;
                    this.exchangeCheckDone = true;
                    return this.currentPrice;
                }
            }
            if (!this.symbolAvailableOnExchange) {
                return this.currentPrice;
            }
            const ticker = await exchange.fetchTicker(this.symbol);
            if (ticker && ticker.last) {
                const priceNum = typeof ticker.last === "number" ? ticker.last : parseFloat(ticker.last);
                this.currentPrice = BigInt(Math.floor(priceNum * 1e18));
                this.lastFetchTime = new Date();
                if (ticker.high) {
                    this.high24h = BigInt(Math.floor(parseFloat(ticker.high.toString()) * 1e18));
                }
                if (ticker.low) {
                    this.low24h = BigInt(Math.floor(parseFloat(ticker.low.toString()) * 1e18));
                }
                if (ticker.baseVolume) {
                    this.volume24h = BigInt(Math.floor(parseFloat(ticker.baseVolume.toString()) * 1e18));
                }
                await this.cachePrice(this.currentPrice);
                this.addToHistory(this.currentPrice);
                this.calculateVolatility();
                return this.currentPrice;
            }
            return this.currentPrice;
        }
        catch (error) {
            const errorMsg = ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
            if (errorMsg.includes("does not have market symbol") ||
                errorMsg.includes("symbol not found") ||
                errorMsg.includes("invalid symbol") ||
                errorMsg.includes("market not found")) {
                this.symbolAvailableOnExchange = false;
                this.exchangeCheckDone = true;
                console_1.logger.info("AI_MM", `Symbol ${this.symbol} not available on exchange - using internal pricing only`);
                return this.currentPrice;
            }
            console_1.logger.error("AI_MM", "External price fetch error", error);
            const internal = await this.getInternalPrice();
            if (internal > BigInt(0)) {
                return internal;
            }
            return this.currentPrice;
        }
    }
    async getCachedPrice() {
        try {
            const key = `ai_market_maker:price:${this.symbol}`;
            const cached = await redis.get(key);
            if (cached) {
                return BigInt(cached);
            }
        }
        catch (error) {
        }
        return BigInt(0);
    }
    async cachePrice(price) {
        try {
            const key = `ai_market_maker:price:${this.symbol}`;
            await redis.set(key, price.toString(), "EX", PRICE_CACHE_TTL);
        }
        catch (error) {
        }
    }
    async getInternalPrice() {
        try {
            const latest = await (0, queries_1.getLatestPrice)(this.marketId);
            if (latest) {
                return latest.price;
            }
        }
        catch (error) {
        }
        return BigInt(0);
    }
    async loadPriceHistory() {
        try {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
            const history = await (0, queries_1.getPriceHistoryInRange)(this.marketId, startTime, endTime, 100);
            this.priceHistory = history.map((h) => ({
                price: h.price,
                timestamp: h.timestamp,
            }));
            this.calculateVolatility();
        }
        catch (error) {
        }
    }
    addToHistory(price) {
        this.priceHistory.push({
            price,
            timestamp: new Date(),
        });
        if (this.priceHistory.length > 100) {
            this.priceHistory = this.priceHistory.slice(-100);
        }
    }
    calculateVolatility() {
        if (this.priceHistory.length < 2) {
            this.volatility = 0;
            return;
        }
        const returns = [];
        for (let i = 1; i < this.priceHistory.length; i++) {
            const prevPrice = Number(this.priceHistory[i - 1].price);
            const currPrice = Number(this.priceHistory[i].price);
            if (prevPrice > 0) {
                returns.push((currPrice - prevPrice) / prevPrice);
            }
        }
        if (returns.length === 0) {
            this.volatility = 0;
            return;
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
        this.volatility = Math.sqrt(variance) * 100;
    }
    getVolatility() {
        return this.volatility;
    }
    getPriceChange(minutes) {
        if (this.priceHistory.length < 2) {
            return { absolute: BigInt(0), percent: 0 };
        }
        const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
        const oldPrices = this.priceHistory.filter((p) => p.timestamp <= cutoffTime);
        if (oldPrices.length === 0) {
            return { absolute: BigInt(0), percent: 0 };
        }
        const oldPrice = oldPrices[oldPrices.length - 1].price;
        const absolute = this.currentPrice - oldPrice;
        const percent = oldPrice > BigInt(0)
            ? (Number(absolute) / Number(oldPrice)) * 100
            : 0;
        return { absolute, percent };
    }
    isPriceInRange(low, high) {
        return this.currentPrice >= low && this.currentPrice <= high;
    }
    get24hStats() {
        let change = 0;
        if (this.low24h > BigInt(0)) {
            change = (Number(this.currentPrice - this.low24h) / Number(this.low24h)) * 100;
        }
        return {
            high: this.high24h,
            low: this.low24h,
            volume: this.volume24h,
            change,
        };
    }
    getPriceHistory() {
        return [...this.priceHistory];
    }
    getTimeSinceLastFetch() {
        if (!this.lastFetchTime) {
            return null;
        }
        return Date.now() - this.lastFetchTime.getTime();
    }
}
exports.PriceTracker = PriceTracker;
exports.default = PriceTracker;
