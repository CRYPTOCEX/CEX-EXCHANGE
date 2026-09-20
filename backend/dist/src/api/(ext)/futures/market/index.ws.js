"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const Websocket_1 = require("@b/handler/Websocket");
const matchingEngine_1 = require("../utils/matchingEngine");
const orderbook_1 = require("../utils/queries/orderbook");
const db_1 = require("@b/db");
exports.metadata = {
    logModule: "FUTURES",
    logTitle: "Futures market data websocket",
};
class UnifiedFuturesMarketDataHandler {
    constructor() {
        this.activeSubscriptions = new Map();
        this.intervalMap = new Map();
        this.engine = null;
    }
    static getInstance() {
        if (!UnifiedFuturesMarketDataHandler.instance) {
            UnifiedFuturesMarketDataHandler.instance = new UnifiedFuturesMarketDataHandler();
        }
        return UnifiedFuturesMarketDataHandler.instance;
    }
    async initializeEngine() {
        if (!this.engine) {
            this.engine = await matchingEngine_1.FuturesMatchingEngine.getInstance();
        }
    }
    async fetchAndBroadcastData(symbol, dataTypes) {
        try {
            await this.initializeEngine();
            const fetchPromises = Array.from(dataTypes).map(async (type) => {
                try {
                    switch (type) {
                        case "orderbook":
                            const orderbook = await (0, orderbook_1.getOrderBook)(symbol);
                            Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market`, { type: "orderbook", symbol }, {
                                stream: "orderbook",
                                data: orderbook,
                            });
                            break;
                        case "trades":
                            Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market`, { type: "trades", symbol }, {
                                stream: "trades",
                                data: [],
                            });
                            break;
                        case "ticker":
                            const ticker = await this.engine.getTicker(symbol);
                            Websocket_1.messageBroker.broadcastToSubscribedClients(`/api/futures/market`, { type: "ticker", symbol }, {
                                stream: "ticker",
                                data: ticker,
                            });
                            break;
                    }
                }
                catch (error) {
                    console.error(`Error fetching ${type} data for ${symbol}:`, error);
                }
            });
            await Promise.allSettled(fetchPromises);
        }
        catch (error) {
            console.error(`Error in fetchAndBroadcastData for ${symbol}:`, error);
        }
    }
    startDataFetching(symbol) {
        if (this.intervalMap.has(symbol)) {
            clearInterval(this.intervalMap.get(symbol));
        }
        const interval = setInterval(async () => {
            const dataTypes = this.activeSubscriptions.get(symbol);
            if (dataTypes && dataTypes.size > 0) {
                await this.fetchAndBroadcastData(symbol, dataTypes);
            }
        }, 500);
        this.intervalMap.set(symbol, interval);
    }
    async addSubscription(symbol, type) {
        if (!symbol) {
            console.warn("No symbol provided in futures subscription request");
            return;
        }
        const [currency, pair] = symbol.split("/");
        if (!currency || !pair) {
            console.warn(`Invalid symbol format: ${symbol}. Expected format: CURRENCY/PAIR`);
            return;
        }
        const market = await db_1.models.futuresMarket.findOne({
            where: {
                currency,
                pair,
                status: true
            }
        });
        if (!market) {
            console.warn(`Futures market ${symbol} not found in database or is disabled. Skipping subscription.`);
            return;
        }
        if (!this.activeSubscriptions.has(symbol)) {
            this.activeSubscriptions.set(symbol, new Set([type]));
            this.startDataFetching(symbol);
        }
        else {
            this.activeSubscriptions.get(symbol).add(type);
        }
        await this.fetchAndBroadcastData(symbol, new Set([type]));
    }
    removeSubscription(symbol, type) {
        if (this.activeSubscriptions.has(symbol)) {
            this.activeSubscriptions.get(symbol).delete(type);
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
}
exports.default = async (data, message) => {
    var _a, _b, _c, _d;
    const { ctx } = data;
    if (typeof message === "string") {
        message = JSON.parse(message);
    }
    const { type, symbol } = message.payload;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing subscription request for ${symbol} (${type})`);
    if (!type || !symbol) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Invalid message structure: missing type or symbol");
        console.error("Invalid message structure: type or symbol is missing");
        return;
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Adding subscription: ${symbol} - ${type}`);
    const handler = UnifiedFuturesMarketDataHandler.getInstance();
    await handler.addSubscription(symbol, type);
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Subscription added for ${symbol} (${type})`);
};
