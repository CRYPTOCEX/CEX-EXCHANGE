"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const Websocket_1 = require("@b/handler/Websocket");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
const redis_1 = require("@b/utils/redis");
const utils_1 = require("../utils");
exports.metadata = {};
const TICKER_CACHE_KEY = "exchange:tickers";
class TickerHandler {
    constructor() {
        this.accumulatedTickers = {};
        this.tickerInterval = null;
        this.unblockTime = 0;
        this.isRunning = false;
        this.consecutiveErrors = 0;
        this.lastErrorMessage = "";
        this.redis = redis_1.RedisSingleton.getInstance();
    }
    static getInstance() {
        if (!TickerHandler.instance) {
            TickerHandler.instance = new TickerHandler();
        }
        return TickerHandler.instance;
    }
    isHandlerRunning() {
        return this.isRunning;
    }
    setHandlerRunning(state) {
        this.isRunning = state;
    }
    startTickerInterval() {
        if (!this.tickerInterval) {
            this.tickerInterval = setInterval(this.flushTickers.bind(this), 1000);
        }
    }
    stopTickerInterval() {
        if (this.tickerInterval) {
            clearInterval(this.tickerInterval);
            this.tickerInterval = null;
        }
    }
    async flushTickers() {
        if (Object.keys(this.accumulatedTickers).length > 0) {
            await this.sendTickersToClients(this.accumulatedTickers);
            await this.updateTickerCache(this.accumulatedTickers);
            this.accumulatedTickers = {};
        }
    }
    async sendTickersToClients(tickers) {
        Websocket_1.messageBroker.broadcastToSubscribedClients("/api/exchange/ticker", { type: "tickers" }, {
            stream: "tickers",
            data: tickers,
        });
    }
    async updateTickerCache(tickers) {
        const cachedTickers = await this.getTickerCache();
        const updatedTickers = { ...cachedTickers, ...tickers };
        const symbolsInDB = await this.getSymbolsInDB();
        const filteredTickers = Object.keys(updatedTickers)
            .filter((symbol) => symbolsInDB.includes(symbol))
            .reduce((obj, key) => {
            obj[key] = updatedTickers[key];
            return obj;
        }, {});
        await this.redis.set(TICKER_CACHE_KEY, JSON.stringify(filteredTickers));
    }
    async getTickerCache() {
        const cachedData = await this.redis.get(TICKER_CACHE_KEY);
        return cachedData ? JSON.parse(cachedData) : {};
    }
    async getSymbolsInDB() {
        const markets = await db_1.models.exchangeMarket.findAll({
            where: { status: true },
            attributes: ["currency", "pair"],
            raw: true,
        });
        return markets.map((market) => `${market.currency}/${market.pair}`);
    }
    async fetchTickersWithRetries(exchange, symbolsInDB) {
        try {
            const allTickers = await exchange.fetchTickers(symbolsInDB);
            if (!allTickers || typeof allTickers !== "object" || Array.isArray(allTickers)) {
                throw new Error("Invalid ticker response from exchange");
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return allTickers;
        }
        catch (error) {
            if (this.isHtmlResponseError(error)) {
                console_1.logger.warn("EXCHANGE", "Exchange returned HTML error page instead of ticker data. Service may be unavailable.");
                throw new Error("Exchange service temporarily unavailable");
            }
            await this.disableInvalidMarkets(error, symbolsInDB);
            throw error;
        }
    }
    async watchTickersWithRetries(exchange, symbolsInDB) {
        try {
            const tickers = await exchange.watchTickers(symbolsInDB);
            if (!tickers || typeof tickers !== "object" || Array.isArray(tickers)) {
                throw new Error("Invalid ticker response from exchange");
            }
            return tickers;
        }
        catch (error) {
            if (this.isHtmlResponseError(error)) {
                console_1.logger.warn("EXCHANGE", "Exchange returned HTML error page instead of ticker data. Service may be unavailable.");
                throw new Error("Exchange service temporarily unavailable");
            }
            await this.disableInvalidMarkets(error, symbolsInDB, true);
            throw error;
        }
    }
    isHtmlResponseError(error) {
        const errorMessage = (error === null || error === void 0 ? void 0 : error.message) || String(error);
        return (errorMessage.includes("Cannot use 'in' operator") ||
            errorMessage.includes("is not valid JSON") ||
            errorMessage.includes("Unexpected token '<'") ||
            errorMessage.includes("Unexpected token <"));
    }
    async disableInvalidMarkets(error, marketSymbols, isWatch = false) {
        const invalidSymbols = this.extractInvalidSymbols(error.message, marketSymbols);
        if (invalidSymbols.length > 0) {
            await db_1.models.exchangeMarket.update({ status: false }, {
                where: {
                    [sequelize_1.Op.or]: invalidSymbols.map((symbol) => {
                        const [currency, pair] = symbol.split("/");
                        return { currency, pair };
                    }),
                },
            });
            if (isWatch) {
                await exchange_1.default.stopExchange();
            }
        }
    }
    extractInvalidSymbols(errorMessage, symbolsInDB) {
        return symbolsInDB.filter((symbol) => errorMessage.includes(symbol));
    }
    processTickers(provider, allTickers, symbolsInDB) {
        return symbolsInDB.reduce((acc, symbol) => {
            if (allTickers[symbol]) {
                acc[symbol] = {
                    last: allTickers[symbol].last,
                    baseVolume: allTickers[symbol].baseVolume ||
                        (provider === "xt" ? allTickers[symbol].info.q : undefined),
                    quoteVolume: allTickers[symbol].quoteVolume,
                    change: allTickers[symbol].percentage,
                };
            }
            return acc;
        }, {});
    }
    async sendInitialTickers() {
        const initialTickers = await this.getTickerCache();
        await this.sendTickersToClients(initialTickers);
    }
    async start() {
        try {
            this.unblockTime = await (0, utils_1.loadBanStatus)();
            while ((0, Websocket_1.hasClients)("/api/exchange/ticker")) {
                if (Date.now() < this.unblockTime) {
                    const waitTime = this.unblockTime - Date.now();
                    console.log(`Waiting for ${(0, utils_1.formatWaitTime)(waitTime)} until unblock time`);
                    await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 60000)));
                    this.unblockTime = await (0, utils_1.loadBanStatus)();
                    continue;
                }
                const exchange = await exchange_1.default.startExchange();
                if (!exchange) {
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    continue;
                }
                const provider = await exchange_1.default.getProvider();
                try {
                    const symbolsInDB = await this.getSymbolsInDB();
                    if (symbolsInDB.length === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 5000));
                        continue;
                    }
                    let allTickers;
                    if (provider === "binance") {
                        allTickers = await this.fetchTickersWithRetries(exchange, symbolsInDB);
                        this.startTickerInterval();
                    }
                    else if (provider === "kucoin") {
                        allTickers = await this.fetchTickersWithRetries(exchange, symbolsInDB);
                        this.stopTickerInterval();
                    }
                    else {
                        if (exchange && exchange.has["watchTickers"]) {
                            allTickers = await this.watchTickersWithRetries(exchange, symbolsInDB);
                            this.startTickerInterval();
                        }
                        else {
                            allTickers = await this.fetchTickersWithRetries(exchange, symbolsInDB);
                            this.stopTickerInterval();
                        }
                    }
                    const filteredTickers = this.processTickers(provider, allTickers, symbolsInDB);
                    if (provider === "binance" ||
                        (provider !== "kucoin" && exchange.has["watchTickers"])) {
                        Object.assign(this.accumulatedTickers, filteredTickers);
                    }
                    else {
                        await this.sendTickersToClients(filteredTickers);
                        await this.updateTickerCache(filteredTickers);
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    this.consecutiveErrors = 0;
                }
                catch (error) {
                    this.consecutiveErrors++;
                    const errorMessage = (error === null || error === void 0 ? void 0 : error.message) || String(error);
                    if (errorMessage !== this.lastErrorMessage || this.consecutiveErrors === 1) {
                        console_1.logger.error("EXCHANGE", "Error in ticker loop", error);
                        this.lastErrorMessage = errorMessage;
                    }
                    else if (this.consecutiveErrors % 10 === 0) {
                        console_1.logger.warn("EXCHANGE", `Ticker loop error persists (${this.consecutiveErrors} consecutive failures): ${errorMessage}`);
                    }
                    const result = await (0, utils_1.handleExchangeError)(error, exchange_1.default);
                    if (typeof result === "number") {
                        this.unblockTime = result;
                        await (0, utils_1.saveBanStatus)(this.unblockTime);
                    }
                    const backoffTime = Math.min(5000 * Math.pow(2, Math.min(this.consecutiveErrors - 1, 3)), 30000);
                    await new Promise((resolve) => setTimeout(resolve, backoffTime));
                }
            }
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Error in ticker handler", error);
        }
        finally {
            this.setHandlerRunning(false);
            this.consecutiveErrors = 0;
            this.lastErrorMessage = "";
        }
    }
}
exports.default = async (data, message) => {
    const handler = TickerHandler.getInstance();
    await handler.sendInitialTickers();
    if (!handler.isHandlerRunning()) {
        handler.setHandlerRunning(true);
        await handler.start();
    }
};
