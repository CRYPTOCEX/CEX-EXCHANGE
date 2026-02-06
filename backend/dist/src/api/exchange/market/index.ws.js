"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const Websocket_1 = require("@b/handler/Websocket");
const utils_1 = require("@b/api/exchange/utils");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {};
class UnifiedMarketDataHandler {
    constructor() {
        this.accumulatedBuffer = {};
        this.bufferInterval = null;
        this.unblockTime = 0;
        this.activeSubscriptions = new Map();
        this.subscriptionParams = new Map();
        this.exchange = null;
        this.symbolToStreamKeys = {};
    }
    getSubscriptionKey(type, interval) {
        if (type === "ohlcv" && interval) {
            return `ohlcv:${interval}`;
        }
        return type;
    }
    static getInstance() {
        if (!UnifiedMarketDataHandler.instance) {
            UnifiedMarketDataHandler.instance = new UnifiedMarketDataHandler();
        }
        return UnifiedMarketDataHandler.instance;
    }
    flushBuffer() {
        Object.entries(this.accumulatedBuffer).forEach(([streamKey, data]) => {
            if (Object.keys(data).length > 0) {
                const route = `/api/exchange/market`;
                const payload = { ...data.payload, symbol: data.symbol };
                Websocket_1.messageBroker.broadcastToSubscribedClients(route, payload, {
                    stream: streamKey,
                    data: data.msg,
                });
                delete this.accumulatedBuffer[streamKey];
            }
        });
    }
    ensureCurrentCandleData(ohlcvData, interval) {
        if (!Array.isArray(ohlcvData) || ohlcvData.length === 0) {
            return ohlcvData;
        }
        const currentCandleTimestamp = this.getCurrentCandleTimestamp(interval);
        const hasCurrentCandle = ohlcvData.some(candle => {
            if (Array.isArray(candle) && candle.length >= 6) {
                const timestamp = Number(candle[0]);
                return Math.abs(timestamp - currentCandleTimestamp) < 5000;
            }
            return false;
        });
        if (!hasCurrentCandle && ohlcvData.length > 0) {
            const lastCandle = ohlcvData[ohlcvData.length - 1];
            if (Array.isArray(lastCandle) && lastCandle.length >= 6) {
                const currentCandle = [
                    currentCandleTimestamp,
                    lastCandle[4],
                    lastCandle[4],
                    lastCandle[4],
                    lastCandle[4],
                    0
                ];
                const updatedData = [...ohlcvData, currentCandle];
                updatedData.sort((a, b) => a[0] - b[0]);
                return updatedData;
            }
        }
        return ohlcvData;
    }
    getCurrentCandleTimestamp(interval) {
        const now = Date.now();
        const intervalMs = this.getIntervalInMs(interval);
        return Math.floor(now / intervalMs) * intervalMs;
    }
    getIntervalInMs(interval) {
        const intervalMap = {
            '1m': 60 * 1000,
            '3m': 3 * 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '30m': 30 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '2h': 2 * 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '8h': 8 * 60 * 60 * 1000,
            '12h': 12 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '3d': 3 * 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000,
            '1M': 30 * 24 * 60 * 60 * 1000,
        };
        return intervalMap[interval] || 60 * 60 * 1000;
    }
    async fetchDataWithRetries(fetchFunction) {
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fetchFunction();
            }
            catch (error) {
                if (i === maxRetries - 1)
                    throw error;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }
    async handleUnifiedSubscription(symbol) {
        const createFetchFunction = (subscriptionKey, payload) => {
            const type = subscriptionKey.split(':')[0];
            switch (type) {
                case 'ticker':
                    return async () => ({
                        msg: await this.exchange.watchTicker(symbol),
                        payload: { type: 'ticker', symbol },
                        streamKey: 'ticker'
                    });
                case 'ohlcv':
                    return async () => {
                        const interval = payload.interval || '1h';
                        const limit = payload.limit || 1000;
                        return {
                            msg: await this.exchange.watchOHLCV(symbol, interval, undefined, Number(limit)),
                            payload: {
                                type: 'ohlcv',
                                interval,
                                symbol
                            },
                            streamKey: `ohlcv:${interval}`
                        };
                    };
                case 'trades':
                    return async () => {
                        const limit = payload.limit || 20;
                        return {
                            msg: await this.exchange.watchTrades(symbol, undefined, Number(limit)),
                            payload: {
                                type: 'trades',
                                symbol
                            },
                            streamKey: 'trades'
                        };
                    };
                case 'orderbook':
                    return async () => {
                        const originalLimit = payload.limit || 50;
                        let exchangeLimit = originalLimit;
                        const provider = await exchange_1.default.getProvider();
                        if (provider === 'kucoin') {
                            const allowedLimits = [5, 20, 50, 100];
                            if (exchangeLimit && !allowedLimits.includes(exchangeLimit)) {
                                exchangeLimit = allowedLimits.reduce((prev, curr) => Math.abs(curr - exchangeLimit) < Math.abs(prev - exchangeLimit) ? curr : prev);
                            }
                        }
                        try {
                            const orderbookResult = await this.exchange.watchOrderBook(symbol, exchangeLimit ? Number(exchangeLimit) : undefined);
                            if (orderbookResult && orderbookResult.asks && orderbookResult.bids) {
                                const limitedOrderbook = {
                                    ...orderbookResult,
                                    asks: orderbookResult.asks.slice(0, originalLimit),
                                    bids: orderbookResult.bids.slice(0, originalLimit)
                                };
                                return {
                                    msg: limitedOrderbook,
                                    payload: {
                                        type: 'orderbook',
                                        ...(originalLimit ? { limit: originalLimit } : {}),
                                        symbol
                                    },
                                    streamKey: originalLimit ? `orderbook:${originalLimit}` : 'orderbook'
                                };
                            }
                            else {
                                console_1.logger.warn("EXCHANGE", `Invalid orderbook data structure for ${symbol}`);
                                return {
                                    msg: { asks: [], bids: [], timestamp: Date.now(), symbol },
                                    payload: {
                                        type: 'orderbook',
                                        ...(originalLimit ? { limit: originalLimit } : {}),
                                        symbol
                                    },
                                    streamKey: originalLimit ? `orderbook:${originalLimit}` : 'orderbook'
                                };
                            }
                        }
                        catch (error) {
                            console_1.logger.error("EXCHANGE", `watchOrderBook failed for ${symbol} (provider: ${provider}): ${error.message}`);
                            console_1.logger.debug("EXCHANGE", `Full error: ${JSON.stringify(error)}`);
                            throw error;
                        }
                    };
                default:
                    return null;
            }
        };
        while (this.activeSubscriptions.has(symbol) &&
            (0, Websocket_1.hasClients)(`/api/exchange/market`)) {
            try {
                if (Date.now() < this.unblockTime) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    continue;
                }
                const subscriptionMap = this.activeSubscriptions.get(symbol);
                if (!subscriptionMap || subscriptionMap.size === 0) {
                    break;
                }
                const fetchPromises = Array.from(subscriptionMap.entries()).map(async ([subscriptionKey, payload]) => {
                    const fetchFn = createFetchFunction(subscriptionKey, payload);
                    if (fetchFn) {
                        try {
                            return await this.fetchDataWithRetries(fetchFn);
                        }
                        catch (error) {
                            console_1.logger.error("EXCHANGE", `Error fetching ${subscriptionKey} data for ${symbol}`, error);
                            return null;
                        }
                    }
                    return null;
                });
                const results = await Promise.allSettled(fetchPromises);
                results.forEach((result) => {
                    if (result.status === 'fulfilled' && result.value) {
                        const { msg, payload, streamKey } = result.value;
                        this.accumulatedBuffer[streamKey] = { symbol, msg, payload };
                    }
                    else if (result.status === 'rejected') {
                        console_1.logger.error("EXCHANGE", `Failed to fetch data for ${symbol}: ${result.reason}`);
                    }
                });
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
            catch (error) {
                console_1.logger.error("EXCHANGE", "Error in unified subscription loop", error);
                const result = await (0, utils_1.handleExchangeError)(error, exchange_1.default);
                if (typeof result === "number") {
                    this.unblockTime = result;
                    await (0, utils_1.saveBanStatus)(this.unblockTime);
                }
                else {
                    this.exchange = result;
                }
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
        console_1.logger.info("EXCHANGE", `Subscription loop ended for ${symbol}`);
        this.activeSubscriptions.delete(symbol);
    }
    async addSubscription(message) {
        try {
            this.unblockTime = await (0, utils_1.loadBanStatus)();
            if (typeof message === "string") {
                message = JSON.parse(message);
            }
            const { symbol, type, interval, limit } = message.payload;
            if (!symbol) {
                console_1.logger.warn("EXCHANGE", "No symbol provided in subscription request");
                return;
            }
            const [currency, pair] = symbol.split("/");
            if (!currency || !pair) {
                console_1.logger.warn("EXCHANGE", `Invalid symbol format: ${symbol}. Expected format: CURRENCY/PAIR`);
                return;
            }
            const market = await db_1.models.exchangeMarket.findOne({
                where: {
                    currency,
                    pair,
                    status: true
                }
            });
            if (!market) {
                console_1.logger.warn("EXCHANGE", `Market ${symbol} not found in database or is disabled. Skipping subscription.`);
                return;
            }
            if (!this.bufferInterval) {
                this.bufferInterval = setInterval(() => this.flushBuffer(), 300);
            }
            if (!this.exchange) {
                this.exchange = await exchange_1.default.startExchange();
                if (!this.exchange) {
                    throw (0, error_1.createError)({ statusCode: 503, message: "Failed to start exchange" });
                }
            }
            const provider = await exchange_1.default.getProvider();
            const typeMap = {
                ticker: "watchTicker",
                ohlcv: "watchOHLCV",
                trades: "watchTrades",
                orderbook: "watchOrderBook",
            };
            if (!this.exchange.has[typeMap[type]]) {
                console_1.logger.info("EXCHANGE", `Endpoint ${type} is not available`);
                return;
            }
            if (type === 'orderbook' && provider === 'kucoin') {
                if (!this.exchange.has['watchOrderBook']) {
                    console_1.logger.warn("EXCHANGE", `KuCoin watchOrderBook not supported, skipping orderbook subscription for ${symbol}`);
                    return;
                }
            }
            const subscriptionKey = this.getSubscriptionKey(type, interval);
            this.subscriptionParams.set(`${symbol}:${type}`, { interval, limit });
            const payload = { type, symbol, interval, limit };
            if (!this.activeSubscriptions.has(symbol)) {
                const newMap = new Map();
                newMap.set(subscriptionKey, payload);
                this.activeSubscriptions.set(symbol, newMap);
                this.handleUnifiedSubscription(symbol);
            }
            else {
                this.activeSubscriptions.get(symbol).set(subscriptionKey, payload);
            }
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Failed to add subscription to market data handler", error);
        }
    }
    async removeSubscription(symbol, type, interval) {
        if (this.activeSubscriptions.has(symbol)) {
            const subscriptionKey = this.getSubscriptionKey(type, interval);
            this.activeSubscriptions.get(symbol).delete(subscriptionKey);
            this.subscriptionParams.delete(`${symbol}:${type}`);
            if (this.activeSubscriptions.get(symbol).size === 0) {
                this.activeSubscriptions.delete(symbol);
                console_1.logger.debug("EXCHANGE", `Removed all subscriptions for ${symbol}`);
            }
            else {
                console_1.logger.debug("EXCHANGE", `Removed ${subscriptionKey} subscription for ${symbol}. Remaining: ${Array.from(this.activeSubscriptions.get(symbol).keys())}`);
            }
        }
    }
    async stop() {
        this.activeSubscriptions.clear();
        this.subscriptionParams.clear();
        if (this.bufferInterval) {
            clearInterval(this.bufferInterval);
            this.bufferInterval = null;
        }
        if (this.exchange) {
            await exchange_1.default.stopExchange();
            this.exchange = null;
        }
    }
}
exports.default = async (data, message) => {
    let parsedMessage;
    if (typeof message === "string") {
        try {
            parsedMessage = JSON.parse(message);
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Invalid JSON message", error);
            return;
        }
    }
    else {
        parsedMessage = message;
    }
    if (!parsedMessage || !parsedMessage.payload) {
        console_1.logger.error("EXCHANGE", "Invalid message structure: payload is missing", new Error("Missing payload"));
        return;
    }
    const { action } = parsedMessage;
    const { type, symbol } = parsedMessage.payload;
    if (!type) {
        console_1.logger.error("EXCHANGE", "Invalid message structure: type is missing", new Error("Missing type field"));
        return;
    }
    const handler = UnifiedMarketDataHandler.getInstance();
    if (action === "UNSUBSCRIBE") {
        if (!symbol) {
            console_1.logger.error("EXCHANGE", "Invalid unsubscribe message: symbol is missing", new Error("Missing symbol"));
            return;
        }
        const interval = parsedMessage.payload.interval;
        await handler.removeSubscription(symbol, type, interval);
    }
    else {
        await handler.addSubscription(parsedMessage);
    }
};
