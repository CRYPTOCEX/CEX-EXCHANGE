"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const { readMarketData } = require("@b/utils/exchange-market-data");
const Websocket_1 = require("@b/handler/Websocket");
const utils_1 = require("@b/api/exchange/utils");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const ws_1 = require("@b/utils/ws");
exports.metadata = {};
const MARKET_ROUTE = "/api/exchange/market";
const MIN_BOOK_LIMIT = 1;
const MAX_BOOK_LIMIT = 500;
const DEFAULT_BOOK_LIMIT = 50;
function isAcceptableBookLimit(limit) {
    if (limit === undefined || limit === null || limit === "")
        return true;
    const value = Number(limit);
    return (Number.isInteger(value) &&
        value >= MIN_BOOK_LIMIT &&
        value <= MAX_BOOK_LIMIT);
}
function copyBookSide(side, limit) {
    const rows = Math.min(Number(limit) || DEFAULT_BOOK_LIMIT, side.length);
    const out = new Array(rows);
    for (let i = 0; i < rows; i++) {
        const level = side[i];
        out[i] = [Number(level[0]), Number(level[1])];
    }
    return out;
}
function normalizeBookLimit(limit) {
    const value = Number(limit);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_BOOK_LIMIT;
}
class UnifiedMarketDataHandler {
    constructor() {
        this.accumulatedBuffer = {};
        this.bufferInterval = null;
        this.unblockTime = 0;
        this.activeSubscriptions = new Map();
        this.exchange = null;
        this.runningStreams = new Set();
    }
    getSubscriptionKey(type, interval, limit) {
        if (type === "ohlcv" && interval) {
            return `ohlcv:${interval}`;
        }
        if (type === "orderbook") {
            return `orderbook:${normalizeBookLimit(limit)}`;
        }
        return type;
    }
    stillWatched(symbol, type, interval, limit) {
        return (0, Websocket_1.hasRouteSubscriber)(MARKET_ROUTE, (payload) => {
            var _a;
            if (!payload || payload.symbol !== symbol || payload.type !== type) {
                return false;
            }
            if (type === "ohlcv") {
                return ((_a = payload.interval) !== null && _a !== void 0 ? _a : undefined) === (interval !== null && interval !== void 0 ? interval : undefined);
            }
            if (type === "orderbook") {
                return normalizeBookLimit(payload.limit) === normalizeBookLimit(limit);
            }
            return true;
        });
    }
    pruneSymbol(symbol) {
        const subscriptionMap = this.activeSubscriptions.get(symbol);
        if (!subscriptionMap)
            return false;
        for (const [subscriptionKey, payload] of [...subscriptionMap.entries()]) {
            const type = subscriptionKey.split(":")[0];
            if (!this.stillWatched(symbol, type, payload === null || payload === void 0 ? void 0 : payload.interval, payload === null || payload === void 0 ? void 0 : payload.limit)) {
                subscriptionMap.delete(subscriptionKey);
            }
        }
        if (subscriptionMap.size === 0) {
            this.activeSubscriptions.delete(symbol);
            return false;
        }
        return true;
    }
    static getInstance() {
        if (!UnifiedMarketDataHandler.instance) {
            UnifiedMarketDataHandler.instance = new UnifiedMarketDataHandler();
        }
        return UnifiedMarketDataHandler.instance;
    }
    flushBuffer() {
        Object.entries(this.accumulatedBuffer).forEach(([bufferKey, data]) => {
            if (Object.keys(data).length > 0) {
                const route = `/api/exchange/market`;
                const payload = { ...data.payload, symbol: data.symbol };
                Websocket_1.messageBroker.broadcastToSubscribedClients(route, payload, {
                    stream: data.streamKey,
                    data: data.msg,
                });
                delete this.accumulatedBuffer[bufferKey];
            }
        });
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
    createFetchFunction(symbol, subscriptionKey, payload) {
        const type = subscriptionKey.split(':')[0];
        switch (type) {
            case 'ticker':
                return async () => ({
                    msg: await readMarketData(this.exchange, "watchTicker", "fetchTicker", [symbol]),
                    payload: { type: 'ticker', symbol },
                    streamKey: 'ticker'
                });
            case 'ohlcv':
                return async () => {
                    const interval = payload.interval || '1h';
                    const limit = payload.limit || 1000;
                    return {
                        msg: await readMarketData(this.exchange, "watchOHLCV", "fetchOHLCV", [symbol, interval, undefined, Number(limit)]),
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
                        msg: await readMarketData(this.exchange, "watchTrades", "fetchTrades", [symbol, undefined, Number(limit)]),
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
                        const orderbookResult = await readMarketData(this.exchange, "watchOrderBook", "fetchOrderBook", [symbol]);
                        if (orderbookResult && orderbookResult.asks && orderbookResult.bids) {
                            const limitedOrderbook = {
                                ...orderbookResult,
                                asks: copyBookSide(orderbookResult.asks, originalLimit),
                                bids: copyBookSide(orderbookResult.bids, originalLimit)
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
                        console_1.logger.warn("EXCHANGE", `Invalid orderbook data structure for ${symbol}`);
                        return null;
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
    }
    async runStream(symbol, subscriptionKey) {
        var _a;
        while (true) {
            const payload = (_a = this.activeSubscriptions.get(symbol)) === null || _a === void 0 ? void 0 : _a.get(subscriptionKey);
            if (!payload)
                return;
            if (Date.now() < this.unblockTime) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            try {
                const fetchFn = this.createFetchFunction(symbol, subscriptionKey, payload);
                if (!fetchFn)
                    return;
                const result = await this.fetchDataWithRetries(fetchFn);
                if (result) {
                    const { msg, payload: framePayload, streamKey } = result;
                    this.accumulatedBuffer[`${symbol}|${streamKey}`] = {
                        symbol,
                        msg,
                        payload: framePayload,
                        streamKey,
                    };
                }
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
            catch (error) {
                console_1.logger.error("EXCHANGE", `Stream ${subscriptionKey} failed for ${symbol}`, error);
                const result = await (0, utils_1.handleExchangeError)(error, exchange_1.default);
                if (typeof result === "number") {
                    this.unblockTime = result;
                    await (0, utils_1.saveBanStatus)(this.unblockTime);
                }
                else if (result) {
                    this.exchange = result;
                }
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
    }
    async handleUnifiedSubscription(symbol) {
        while (this.pruneSymbol(symbol)) {
            const subscriptionMap = this.activeSubscriptions.get(symbol);
            if (!subscriptionMap || subscriptionMap.size === 0)
                break;
            for (const subscriptionKey of subscriptionMap.keys()) {
                const streamId = `${symbol}|${subscriptionKey}`;
                if (this.runningStreams.has(streamId))
                    continue;
                this.runningStreams.add(streamId);
                void this.runStream(symbol, subscriptionKey)
                    .catch((error) => console_1.logger.error("EXCHANGE", `Stream ${streamId} ended abnormally`, error))
                    .finally(() => this.runningStreams.delete(streamId));
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        console_1.logger.info("EXCHANGE", `Subscription supervisor ended for ${symbol}`);
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
            if (!this.exchange.has[typeMap[type]] && !this.exchange.has[typeMap[type]?.replace("watch", "fetch")]) {
                console_1.logger.info("EXCHANGE", `Endpoint ${type} is not available`);
                return;
            }
            if (type === 'orderbook' && provider === 'kucoin') {
                if (!this.exchange.has['watchOrderBook'] && !this.exchange.has['fetchOrderBook']) {
                    console_1.logger.warn("EXCHANGE", `KuCoin watchOrderBook not supported, skipping orderbook subscription for ${symbol}`);
                    return;
                }
            }
            if (type === "orderbook" && !isAcceptableBookLimit(limit)) {
                console_1.logger.warn("EXCHANGE", `Rejected orderbook subscription for ${symbol}: unusable limit ${limit}`);
                return;
            }
            const subscriptionKey = this.getSubscriptionKey(type, interval, limit);
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
    async removeSubscription(symbol, type, interval, limit) {
        const subscriptionMap = this.activeSubscriptions.get(symbol);
        if (!subscriptionMap)
            return;
        const subscriptionKey = this.getSubscriptionKey(type, interval, limit);
        if (this.stillWatched(symbol, type, interval, limit)) {
            console_1.logger.debug("EXCHANGE", `Kept ${subscriptionKey} for ${symbol}: other clients are still subscribed`);
            return;
        }
        subscriptionMap.delete(subscriptionKey);
        if (subscriptionMap.size === 0) {
            this.activeSubscriptions.delete(symbol);
            console_1.logger.debug("EXCHANGE", `Removed all subscriptions for ${symbol}`);
        }
        else {
            console_1.logger.debug("EXCHANGE", `Removed ${subscriptionKey} subscription for ${symbol}. Remaining: ${Array.from(subscriptionMap.keys())}`);
        }
    }
    async stop() {
        this.activeSubscriptions.clear();
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
        (0, ws_1.logUnactionableFrame)("EXCHANGE", data, parsedMessage);
        return;
    }
    const { action } = parsedMessage;
    const { type, symbol } = parsedMessage.payload;
    if (!type) {
        (0, ws_1.logUnactionableFrame)("EXCHANGE", data, parsedMessage);
        return;
    }
    const handler = UnifiedMarketDataHandler.getInstance();
    if (action === "UNSUBSCRIBE") {
        if (!symbol) {
            console_1.logger.error("EXCHANGE", "Invalid unsubscribe message: symbol is missing", new Error("Missing symbol"));
            return;
        }
        const interval = parsedMessage.payload.interval;
        const limit = parsedMessage.payload.limit;
        await handler.removeSubscription(symbol, type, interval, limit);
    }
    else {
        await handler.addSubscription(parsedMessage);
    }
};
