"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.clearOrderbookCache = clearOrderbookCache;
exports.forceOrderbookBroadcast = forceOrderbookBroadcast;
const Websocket_1 = require("@b/handler/Websocket");
const matchingEngine_1 = require("@b/api/(ext)/ecosystem/utils/matchingEngine");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
exports.metadata = {
    logModule: "ECOSYSTEM",
    logTitle: "Market WebSocket connection"
};
class UnifiedEcosystemMarketDataHandler {
    constructor() {
        this.activeSubscriptions = new Map();
        this.intervalMap = new Map();
        this.lastTickerData = new Map();
        this.lastOrderbookData = new Map();
        this.engine = null;
    }
    getSubscriptionKey(type, payload) {
        if (type === "ohlcv" && payload.interval) {
            return `ohlcv:${payload.interval}`;
        }
        return type;
    }
    static getInstance() {
        if (!UnifiedEcosystemMarketDataHandler.instance) {
            UnifiedEcosystemMarketDataHandler.instance = new UnifiedEcosystemMarketDataHandler();
        }
        return UnifiedEcosystemMarketDataHandler.instance;
    }
    async initializeEngine() {
        if (!this.engine) {
            this.engine = await matchingEngine_1.MatchingEngine.getInstance();
        }
    }
    async fetchAndBroadcastData(symbol, subscriptionMap, isInitialFetch = false) {
        try {
            await this.initializeEngine();
            const fetchPromises = Array.from(subscriptionMap.entries()).map(async ([subscriptionKey, payload]) => {
                const type = subscriptionKey.split(':')[0];
                try {
                    switch (type) {
                        case "orderbook":
                            const orderbook = await (0, queries_1.getOrderBook)(symbol);
                            const orderbookHash = JSON.stringify(orderbook);
                            const lastOrderbookHash = this.lastOrderbookData.get(symbol);
                            if (isInitialFetch || lastOrderbookHash !== orderbookHash) {
                                this.lastOrderbookData.set(symbol, orderbookHash);
                                const streamKey = payload.limit ? `orderbook:${payload.limit}` : 'orderbook';
                                Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, payload, { stream: streamKey, data: orderbook });
                            }
                            break;
                        case "trades":
                            try {
                                const limit = payload.limit || 50;
                                const trades = await (0, queries_1.getRecentTrades)(symbol, limit);
                                if (trades && trades.length > 0) {
                                    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, payload, { stream: "trades", data: trades });
                                }
                            }
                            catch (tradesError) {
                                console_1.logger.error("ECO_WS", `Error fetching trades for ${symbol}`, tradesError);
                            }
                            break;
                        case "ticker":
                            const ticker = await this.engine.getTicker(symbol);
                            const lastTicker = this.lastTickerData.get(symbol);
                            const tickerChanged = !lastTicker ||
                                lastTicker.last !== ticker.last ||
                                lastTicker.baseVolume !== ticker.baseVolume ||
                                lastTicker.quoteVolume !== ticker.quoteVolume ||
                                lastTicker.change !== ticker.change;
                            if (isInitialFetch || tickerChanged) {
                                this.lastTickerData.set(symbol, ticker);
                                Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, payload, { stream: "ticker", data: ticker });
                            }
                            break;
                        case "ohlcv":
                            try {
                                const interval = payload.interval || "1m";
                                const limit = payload.limit || 100;
                                const ohlcv = await (0, queries_1.getOHLCV)(symbol, interval, limit);
                                const streamKey = `ohlcv:${interval}`;
                                if (ohlcv && ohlcv.length > 0) {
                                    Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, payload, { stream: streamKey, data: ohlcv });
                                }
                            }
                            catch (ohlcvError) {
                                console_1.logger.error("ECO_WS", `Error fetching OHLCV for ${symbol}`, ohlcvError);
                            }
                            break;
                    }
                }
                catch (error) {
                    console_1.logger.error("ECO_WS", `Error fetching ${type} data for ${symbol}`, error);
                }
            });
            await Promise.allSettled(fetchPromises);
        }
        catch (error) {
            console_1.logger.error("ECO_WS", `Error in fetchAndBroadcastData for ${symbol}`, error);
        }
    }
    startDataFetching(symbol) {
        if (this.intervalMap.has(symbol)) {
            clearInterval(this.intervalMap.get(symbol));
        }
        const interval = setInterval(async () => {
            const subscriptionMap = this.activeSubscriptions.get(symbol);
            if (subscriptionMap && subscriptionMap.size > 0) {
                await this.fetchAndBroadcastData(symbol, subscriptionMap);
            }
        }, 2000);
        this.intervalMap.set(symbol, interval);
    }
    async addSubscription(symbol, payload) {
        if (!symbol) {
            console_1.logger.warn("ECO_WS", "No symbol provided in ecosystem subscription request");
            return;
        }
        const [currency, pair] = symbol.split("/");
        if (!currency || !pair) {
            console_1.logger.warn("ECO_WS", `Invalid symbol format: ${symbol}. Expected format: CURRENCY/PAIR`);
            return;
        }
        const market = await db_1.models.ecosystemMarket.findOne({
            where: {
                currency,
                pair,
                status: true
            }
        });
        if (!market) {
            console_1.logger.warn("ECO_WS", `Ecosystem market ${symbol} not found in database or is disabled. Skipping subscription.`);
            return;
        }
        const type = payload.type;
        const subscriptionKey = this.getSubscriptionKey(type, payload);
        if (!this.activeSubscriptions.has(symbol)) {
            const newMap = new Map();
            newMap.set(subscriptionKey, payload);
            this.activeSubscriptions.set(symbol, newMap);
            this.startDataFetching(symbol);
        }
        else {
            this.activeSubscriptions.get(symbol).set(subscriptionKey, payload);
        }
        const singleSubscriptionMap = new Map();
        singleSubscriptionMap.set(subscriptionKey, payload);
        await this.fetchAndBroadcastData(symbol, singleSubscriptionMap, true);
    }
    removeSubscription(symbol, type, payload) {
        if (this.activeSubscriptions.has(symbol)) {
            const subscriptionKey = this.getSubscriptionKey(type, payload || {});
            this.activeSubscriptions.get(symbol).delete(subscriptionKey);
            if (this.activeSubscriptions.get(symbol).size === 0) {
                this.activeSubscriptions.delete(symbol);
                if (this.intervalMap.has(symbol)) {
                    clearInterval(this.intervalMap.get(symbol));
                    this.intervalMap.delete(symbol);
                }
            }
        }
    }
    stop() {
        this.intervalMap.forEach((interval) => clearInterval(interval));
        this.intervalMap.clear();
        this.activeSubscriptions.clear();
    }
    clearOrderbookCache(symbol) {
        this.lastOrderbookData.delete(symbol);
        console_1.logger.debug("ECO_WS", `Cleared orderbook cache for ${symbol}`);
    }
    async forceOrderbookBroadcast(symbol) {
        try {
            this.clearOrderbookCache(symbol);
            const subscriptionMap = this.activeSubscriptions.get(symbol);
            if (!subscriptionMap) {
                console_1.logger.debug("ECO_WS", `No active subscriptions for ${symbol}, skipping forced broadcast`);
                return;
            }
            const orderbookPayload = subscriptionMap.get("orderbook");
            if (orderbookPayload) {
                const orderbook = await (0, queries_1.getOrderBook)(symbol);
                const orderbookHash = JSON.stringify(orderbook);
                this.lastOrderbookData.set(symbol, orderbookHash);
                const streamKey = orderbookPayload.limit ? `orderbook:${orderbookPayload.limit}` : 'orderbook';
                Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/ecosystem/market`, orderbookPayload, { stream: streamKey, data: orderbook });
                console_1.logger.debug("ECO_WS", `Forced orderbook broadcast for ${symbol}`);
            }
        }
        catch (error) {
            console_1.logger.error("ECO_WS", `Failed to force orderbook broadcast for ${symbol}`, error);
        }
    }
}
function clearOrderbookCache(symbol) {
    UnifiedEcosystemMarketDataHandler.getInstance().clearOrderbookCache(symbol);
}
async function forceOrderbookBroadcast(symbol) {
    await UnifiedEcosystemMarketDataHandler.getInstance().forceOrderbookBroadcast(symbol);
}
exports.default = async (data, message) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing market WebSocket message");
    if (typeof message === "string") {
        message = JSON.parse(message);
    }
    const { action, payload } = message;
    const { type, symbol } = payload || {};
    if (!type || !symbol) {
        console_1.logger.error("ECO_WS", "Invalid message structure: type or symbol is missing");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid message structure: missing type or symbol");
        return;
    }
    const handler = UnifiedEcosystemMarketDataHandler.getInstance();
    if (action === "SUBSCRIBE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Subscribing to ${type} for ${symbol}`);
        await handler.addSubscription(symbol, payload);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Subscribed to ${type} for ${symbol}`);
    }
    else if (action === "UNSUBSCRIBE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Unsubscribing from ${type} for ${symbol}`);
        handler.removeSubscription(symbol, type, payload);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Unsubscribed from ${type} for ${symbol}`);
    }
};
