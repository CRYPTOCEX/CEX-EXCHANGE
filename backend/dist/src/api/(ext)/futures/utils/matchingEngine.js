"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuturesMatchingEngine = void 0;
let client;
let scyllaFuturesKeyspace;
let fromBigInt;
let removeTolerance;
let toBigIntFloat;
let normalizeTimeToInterval;
let Candle;
try {
    const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
    client = clientModule.default;
    scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
    removeTolerance = blockchainModule.removeTolerance;
    toBigIntFloat = blockchainModule.toBigIntFloat;
    const wsModule = require("@b/api/(ext)/ecosystem/utils/ws");
    normalizeTimeToInterval = wsModule.normalizeTimeToInterval;
    const queriesModule = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
    Candle = queriesModule.Candle;
}
catch (e) {
}
const orderbook_1 = require("./orderbook");
const ws_1 = require("./ws");
const markets_1 = require("./markets");
const console_1 = require("@b/utils/console");
const candles_1 = require("./candles");
const matchmaking_1 = require("./matchmaking");
const order_1 = require("./queries/order");
const candle_1 = require("./queries/candle");
const orderbook_2 = require("./queries/orderbook");
const positions_1 = require("./queries/positions");
const liquidation_1 = require("./liquidation");
const position_1 = require("./position");
class FuturesMatchingEngine {
    constructor() {
        this.orderQueue = {};
        this.marketsBySymbol = {};
        this.lockedOrders = new Set();
        this.lastCandle = {};
        this.yesterdayCandle = {};
    }
    static getInstance() {
        if (!this.instancePromise) {
            this.instancePromise = (async () => {
                const instance = new FuturesMatchingEngine();
                await instance.init();
                return instance;
            })();
        }
        return this.instancePromise;
    }
    async init() {
        if (!client || !scyllaFuturesKeyspace) {
            console_1.logger.warn("FUTURES", "Ecosystem extension not available, futures matching engine disabled");
            return;
        }
        await this.initializeMarkets();
        await this.initializeOrders();
        await this.initializeLastCandles();
        await this.initializeYesterdayCandles();
        await this.initializePositions();
    }
    async initializeMarkets() {
        const markets = await (0, markets_1.getFuturesMarkets)();
        markets.forEach((market) => {
            const symbol = `${market.currency}/${market.pair}`;
            market.symbol = symbol;
            this.marketsBySymbol[symbol] = market;
            this.orderQueue[symbol] = [];
        });
    }
    async initializeOrders() {
        try {
            const openOrders = await (0, order_1.getAllOpenOrders)();
            openOrders.forEach((order) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                const createdAt = new Date(order.createdAt);
                const updatedAt = new Date(order.updatedAt);
                if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
                    console_1.logger.error("FUTURES", "Invalid date in order", new Error("Invalid date in order"));
                    return;
                }
                if (!((_a = order.userId) === null || _a === void 0 ? void 0 : _a.buffer) || !((_b = order.id) === null || _b === void 0 ? void 0 : _b.buffer)) {
                    console_1.logger.error("FUTURES", "Invalid Uuid in order", new Error("Invalid Uuid in order"));
                    return;
                }
                const normalizedOrder = {
                    ...order,
                    userId: (0, order_1.uuidToString)(order.userId),
                    id: (0, order_1.uuidToString)(order.id),
                    amount: BigInt((_c = order.amount) !== null && _c !== void 0 ? _c : 0),
                    price: BigInt((_d = order.price) !== null && _d !== void 0 ? _d : 0),
                    cost: BigInt((_e = order.cost) !== null && _e !== void 0 ? _e : 0),
                    fee: BigInt((_f = order.fee) !== null && _f !== void 0 ? _f : 0),
                    remaining: BigInt((_g = order.remaining) !== null && _g !== void 0 ? _g : 0),
                    filled: BigInt((_h = order.filled) !== null && _h !== void 0 ? _h : 0),
                    createdAt,
                    updatedAt,
                    leverage: BigInt((_j = order.leverage) !== null && _j !== void 0 ? _j : 0),
                    stopLossPrice: order.stopLossPrice
                        ? BigInt(order.stopLossPrice)
                        : null,
                    takeProfitPrice: order.takeProfitPrice
                        ? BigInt(order.takeProfitPrice)
                        : null,
                };
                if (!this.orderQueue[normalizedOrder.symbol]) {
                    this.orderQueue[normalizedOrder.symbol] = [];
                }
                this.orderQueue[normalizedOrder.symbol].push(normalizedOrder);
            });
            await this.processQueue();
        }
        catch (error) {
            console_1.logger.error("FUTURES", "Failed to populate order queue with open orders", error);
        }
    }
    async initializeLastCandles() {
        try {
            const lastCandles = await (0, candle_1.getLastCandles)();
            lastCandles.forEach((candle) => {
                if (!this.lastCandle[candle.symbol]) {
                    this.lastCandle[candle.symbol] = {};
                }
                this.lastCandle[candle.symbol][candle.interval] = candle;
            });
        }
        catch (error) {
            console_1.logger.error("FUTURES", "Failed to initialize last candles", error);
        }
    }
    async initializeYesterdayCandles() {
        try {
            const yesterdayCandles = await (0, candle_1.getYesterdayCandles)();
            Object.keys(yesterdayCandles).forEach((symbol) => {
                const candles = yesterdayCandles[symbol];
                if (candles.length > 0) {
                    this.yesterdayCandle[symbol] = candles[0];
                }
            });
        }
        catch (error) {
            console_1.logger.error("FUTURES", "Failed to initialize yesterday's candles", error);
        }
    }
    async initializePositions() {
        if (!toBigIntFloat || !fromBigInt) {
            console_1.logger.warn("FUTURES", "Ecosystem extension not available for position initialization");
            return;
        }
        try {
            const openPositions = await (0, positions_1.getAllOpenPositions)();
            const userIds = [
                ...new Set(openPositions.map((position) => position.userId)),
            ];
            await Promise.all(userIds.map(async (userId) => {
                const positions = openPositions.filter((position) => position.userId === userId);
                await Promise.all(positions.map(async (position) => {
                    var _a;
                    const lastCandle = (_a = this.lastCandle[position.symbol]) === null || _a === void 0 ? void 0 : _a["1m"];
                    if (lastCandle) {
                        const currentPrice = toBigIntFloat(lastCandle.close);
                        const unrealizedPnl = (0, position_1.calculateUnrealizedPnl)(position.entryPrice, position.amount, currentPrice, position.side);
                        await (0, positions_1.updatePositionInDB)(position.userId, position.id, position.entryPrice, position.amount, unrealizedPnl, position.stopLossPrice, position.takeProfitPrice);
                        await (0, liquidation_1.checkForLiquidation)(position, Number(fromBigInt(currentPrice)));
                    }
                }));
            }));
        }
        catch (error) {
            console_1.logger.error("FUTURES", "Failed to initialize positions", error);
        }
    }
    async processQueue() {
        if (!client || !removeTolerance || !toBigIntFloat) {
            console_1.logger.warn("FUTURES", "Ecosystem extension not available for queue processing");
            return;
        }
        const ordersToUpdate = [];
        const orderBookUpdates = {};
        const allOrderBookEntries = await (0, orderbook_2.fetchOrderBooks)();
        const mappedOrderBook = {};
        allOrderBookEntries === null || allOrderBookEntries === void 0 ? void 0 : allOrderBookEntries.forEach((entry) => {
            if (!mappedOrderBook[entry.symbol]) {
                mappedOrderBook[entry.symbol] = { bids: {}, asks: {} };
            }
            mappedOrderBook[entry.symbol][entry.side.toLowerCase()][removeTolerance(toBigIntFloat(Number(entry.price))).toString()] = removeTolerance(toBigIntFloat(Number(entry.amount)));
        });
        const calculationPromises = [];
        for (const symbol in this.orderQueue) {
            const orders = this.orderQueue[symbol];
            if (orders.length === 0)
                continue;
            const promise = (async () => {
                const { matchedOrders, bookUpdates } = await (0, matchmaking_1.matchAndCalculateOrders)(orders, mappedOrderBook[symbol] || { bids: {}, asks: {} });
                if (matchedOrders.length === 0) {
                    return;
                }
                ordersToUpdate.push(...matchedOrders);
                orderBookUpdates[symbol] = bookUpdates;
            })();
            calculationPromises.push(promise);
        }
        await Promise.all(calculationPromises);
        if (ordersToUpdate.length === 0) {
            return;
        }
        await this.performUpdates(ordersToUpdate, orderBookUpdates);
        const finalOrderBooks = {};
        for (const symbol in orderBookUpdates) {
            finalOrderBooks[symbol] = (0, orderbook_1.applyUpdatesToOrderBook)(mappedOrderBook[symbol], orderBookUpdates[symbol]);
        }
        const cleanupPromises = [];
        for (const symbol in this.orderQueue) {
            const promise = (async () => {
                this.orderQueue[symbol] = this.orderQueue[symbol].filter((order) => order.status === "OPEN");
            })();
            cleanupPromises.push(promise);
        }
        await Promise.all(cleanupPromises);
        this.broadcastUpdates(ordersToUpdate, finalOrderBooks);
    }
    async performUpdates(ordersToUpdate, orderBookUpdates) {
        const locked = this.lockOrders(ordersToUpdate);
        if (!locked) {
            console_1.logger.warn("FUTURES", "Couldn't obtain a lock on all orders, skipping this batch.");
            return;
        }
        const updateQueries = [];
        updateQueries.push(...(0, order_1.generateOrderUpdateQueries)(ordersToUpdate));
        const latestOrdersForCandles = (0, candles_1.getLatestOrdersForCandles)(ordersToUpdate);
        for (const order of latestOrdersForCandles) {
            const candleQueries = await this.updateLastCandles(order);
            updateQueries.push(...candleQueries);
        }
        const orderBookQueries = (0, orderbook_2.generateOrderBookUpdateQueries)(orderBookUpdates);
        updateQueries.push(...orderBookQueries);
        if (updateQueries.length > 0) {
            try {
                await client.batch(updateQueries, { prepare: true });
            }
            catch (error) {
                console_1.logger.error("FUTURES", "Failed to batch update", error);
            }
        }
        else {
            console_1.logger.warn("FUTURES", "No queries to batch update.");
        }
        const positionPromises = ordersToUpdate.map(async (order) => {
            const positions = await (0, positions_1.getPositions)(order.userId, order.symbol, "OPEN");
            if (positions.length > 0) {
                if (fromBigInt) {
                    await Promise.all(positions.map((position) => (0, liquidation_1.checkForLiquidation)(position, fromBigInt(order.price))));
                }
                await Promise.all(positions.map((position) => (0, ws_1.handlePositionBroadcast)(position)));
            }
        });
        await Promise.all(positionPromises);
        this.unlockOrders(ordersToUpdate);
    }
    async addToQueue(order) {
        if (!(0, matchmaking_1.validateOrder)(order)) {
            return;
        }
        if (!order.createdAt ||
            isNaN(new Date(order.createdAt).getTime()) ||
            !order.updatedAt ||
            isNaN(new Date(order.updatedAt).getTime())) {
            console_1.logger.error("FUTURES", "Invalid date in order", new Error("Invalid date in order"));
            return;
        }
        if (!this.orderQueue[order.symbol]) {
            this.orderQueue[order.symbol] = [];
        }
        this.orderQueue[order.symbol].push(order);
        const symbolOrderBook = await (0, orderbook_2.updateSingleOrderBook)(order, "add");
        (0, ws_1.handleOrderBookBroadcast)(order.symbol, symbolOrderBook);
        await this.processQueue();
    }
    async updateLastCandles(order) {
        if (!toBigIntFloat || !fromBigInt || !scyllaFuturesKeyspace || !normalizeTimeToInterval) {
            console_1.logger.warn("FUTURES", "Ecosystem extension not available for candle updates");
            return [];
        }
        let finalPrice = BigInt(0);
        let trades;
        try {
            trades = JSON.parse(order.trades);
        }
        catch (error) {
            console_1.logger.error("FUTURES", "Failed to parse trades", error);
            return [];
        }
        if (trades &&
            trades.length > 0 &&
            trades[trades.length - 1].price !== undefined) {
            finalPrice = toBigIntFloat ? toBigIntFloat(trades[trades.length - 1].price) : BigInt(0);
        }
        else if (order.price !== undefined) {
            finalPrice = order.price;
        }
        else {
            console_1.logger.error("FUTURES", "Neither trade prices nor order price are available", new Error("Neither trade prices nor order price are available"));
            return [];
        }
        const updateQueries = [];
        if (!this.lastCandle[order.symbol]) {
            this.lastCandle[order.symbol] = {};
        }
        for (const interval of candles_1.intervals) {
            const updateQuery = await this.generateCandleQueries(order, interval, finalPrice);
            if (updateQuery) {
                updateQueries.push(updateQuery);
            }
        }
        return updateQueries;
    }
    async generateCandleQueries(order, interval, finalPrice) {
        var _a;
        let existingLastCandle = (_a = this.lastCandle[order.symbol]) === null || _a === void 0 ? void 0 : _a[interval];
        const normalizedCurrentTime = normalizeTimeToInterval(new Date().getTime(), interval);
        const normalizedLastCandleTime = existingLastCandle
            ? normalizeTimeToInterval(new Date(existingLastCandle.createdAt).getTime(), interval)
            : null;
        const shouldCreateNewCandle = !existingLastCandle || normalizedCurrentTime !== normalizedLastCandleTime;
        if (shouldCreateNewCandle) {
            let newOpenPrice;
            if (existingLastCandle) {
                newOpenPrice = existingLastCandle.close;
            }
            else {
                const dbCandle = await (0, candle_1.getLatestCandleForSymbol)(order.symbol, interval);
                if (dbCandle) {
                    newOpenPrice = dbCandle.close;
                    if (!this.lastCandle[order.symbol]) {
                        this.lastCandle[order.symbol] = {};
                    }
                    this.lastCandle[order.symbol][interval] = dbCandle;
                }
                else {
                    newOpenPrice = fromBigInt ? fromBigInt(finalPrice) : 0;
                }
            }
            if (!newOpenPrice && newOpenPrice !== 0) {
                return null;
            }
            const finalPriceNumber = fromBigInt ? fromBigInt(finalPrice) : 0;
            const normalizedTime = new Date(normalizeTimeToInterval(new Date().getTime(), interval));
            const newLastCandle = {
                symbol: order.symbol,
                interval,
                open: newOpenPrice,
                high: Math.max(newOpenPrice, finalPriceNumber),
                low: Math.min(newOpenPrice, finalPriceNumber),
                close: finalPriceNumber,
                volume: fromBigInt ? fromBigInt(order.amount) : 0,
                createdAt: normalizedTime,
                updatedAt: new Date(),
            };
            if (!this.lastCandle[order.symbol]) {
                this.lastCandle[order.symbol] = {};
            }
            this.lastCandle[order.symbol][interval] = newLastCandle;
            return {
                query: `INSERT INTO ${scyllaFuturesKeyspace}.candles (symbol, interval, "createdAt", "updatedAt", open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params: [
                    order.symbol,
                    interval,
                    newLastCandle.createdAt,
                    newLastCandle.updatedAt,
                    newOpenPrice,
                    newLastCandle.high,
                    newLastCandle.low,
                    newLastCandle.close,
                    newLastCandle.volume,
                ],
            };
        }
        else {
            let updateQuery = `UPDATE ${scyllaFuturesKeyspace}.candles SET "updatedAt" = ?, close = ?`;
            const now = new Date();
            const finalPriceNumber = fromBigInt ? fromBigInt(finalPrice) : 0;
            const updateParams = [now, finalPriceNumber];
            const newVolume = existingLastCandle.volume + (fromBigInt ? fromBigInt(order.amount) : 0);
            updateQuery += ", volume = ?";
            updateParams.push(newVolume);
            if (finalPriceNumber > existingLastCandle.high) {
                updateQuery += ", high = ?";
                updateParams.push(finalPriceNumber);
                existingLastCandle.high = finalPriceNumber;
            }
            else if (finalPriceNumber < existingLastCandle.low) {
                updateQuery += ", low = ?";
                updateParams.push(finalPriceNumber);
                existingLastCandle.low = finalPriceNumber;
            }
            existingLastCandle.close = finalPriceNumber;
            existingLastCandle.volume = newVolume;
            existingLastCandle.updatedAt = now;
            this.lastCandle[order.symbol][interval] = existingLastCandle;
            updateQuery += ` WHERE symbol = ? AND interval = ? AND "createdAt" = ?`;
            updateParams.push(order.symbol, interval, existingLastCandle.createdAt);
            return {
                query: updateQuery,
                params: updateParams,
            };
        }
    }
    async broadcastUpdates(ordersToUpdate, finalOrderBooks) {
        const updatePromises = [];
        updatePromises.push(...this.createOrdersBroadcastPromise(ordersToUpdate));
        for (const symbol in this.orderQueue) {
            if (finalOrderBooks[symbol]) {
                updatePromises.push(this.createOrderBookUpdatePromise(symbol, finalOrderBooks[symbol]));
                updatePromises.push(...this.createCandleBroadcastPromises(symbol));
            }
        }
        await Promise.all(updatePromises);
    }
    createOrderBookUpdatePromise(symbol, finalOrderBookState) {
        return (0, ws_1.handleOrderBookBroadcast)(symbol, finalOrderBookState);
    }
    createCandleBroadcastPromises(symbol) {
        const promises = [];
        for (const interval in this.lastCandle[symbol]) {
            promises.push((0, ws_1.handleCandleBroadcast)(symbol, interval, this.lastCandle[symbol][interval]));
        }
        promises.push((0, ws_1.handleTickerBroadcast)(symbol, this.getTicker(symbol)), (0, ws_1.handleTickersBroadcast)(this.getTickers()));
        return promises;
    }
    createOrdersBroadcastPromise(orders) {
        return orders.map((order) => (0, ws_1.handleOrderBroadcast)(order));
    }
    lockOrders(orders) {
        for (const order of orders) {
            if (this.lockedOrders.has(order.id)) {
                return false;
            }
        }
        for (const order of orders) {
            this.lockedOrders.add(order.id);
        }
        return true;
    }
    unlockOrders(orders) {
        for (const order of orders) {
            this.lockedOrders.delete(order.id);
        }
    }
    async handleOrderCancellation(orderId, symbol) {
        this.orderQueue[symbol] = this.orderQueue[symbol].filter((order) => order.id !== orderId);
        const updatedOrderBook = await (0, orderbook_2.fetchExistingAmounts)(symbol);
        (0, ws_1.handleOrderBookBroadcast)(symbol, updatedOrderBook);
        await this.processQueue();
    }
    getTickers() {
        const symbolsWithTickers = {};
        for (const symbol in this.marketsBySymbol) {
            symbolsWithTickers[symbol] = this.getTicker(symbol);
        }
        return symbolsWithTickers;
    }
    getTicker(symbol) {
        var _a;
        const lastCandle = (_a = this.lastCandle[symbol]) === null || _a === void 0 ? void 0 : _a["1d"];
        const previousCandle = this.yesterdayCandle[symbol];
        if (!lastCandle) {
            return {
                symbol,
                last: 0,
                baseVolume: 0,
                quoteVolume: 0,
                change: 0,
                percentage: 0,
                high: 0,
                low: 0,
            };
        }
        const last = lastCandle.close;
        const baseVolume = lastCandle.volume;
        const quoteVolume = last * baseVolume;
        let change = 0;
        let percentage = 0;
        if (previousCandle) {
            const open = previousCandle.close;
            const close = lastCandle.close;
            change = close - open;
            percentage = ((close - open) / open) * 100;
        }
        return {
            symbol,
            last,
            baseVolume,
            quoteVolume,
            percentage,
            change,
            high: lastCandle.high,
            low: lastCandle.low,
        };
    }
}
exports.FuturesMatchingEngine = FuturesMatchingEngine;
FuturesMatchingEngine.instancePromise = null;
