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
exports.MatchingEngine = void 0;
const blockchain_1 = require("./blockchain");
const candles_1 = require("./candles");
const matchmaking_1 = require("./matchmaking");
const orderbook_1 = require("./orderbook");
const client_1 = __importStar(require("./scylla/client"));
const queries_1 = require("./scylla/queries");
const ws_1 = require("./ws");
const markets_1 = require("./markets");
const console_1 = require("@b/utils/console");
const uuid_1 = require("uuid");
const error_1 = require("@b/utils/error");
let aiMarketMakerSymbolsCache = new Set();
let aiMarketMakerCacheLastRefresh = 0;
const AI_MARKET_MAKER_CACHE_TTL = 60000;
async function getAiMarketMakerSymbols(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && aiMarketMakerSymbolsCache.size > 0 && now - aiMarketMakerCacheLastRefresh < AI_MARKET_MAKER_CACHE_TTL) {
        return aiMarketMakerSymbolsCache;
    }
    try {
        const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
        const activeMarketMakers = await models.aiMarketMaker.findAll({
            where: { status: "ACTIVE" },
            include: [{
                    model: models.ecosystemMarket,
                    as: "market",
                    attributes: ["currency", "pair"],
                }],
        });
        const symbols = new Set();
        for (const maker of activeMarketMakers) {
            if (maker.market) {
                const symbol = `${maker.market.currency}/${maker.market.pair}`;
                symbols.add(symbol);
            }
        }
        aiMarketMakerSymbolsCache = symbols;
        aiMarketMakerCacheLastRefresh = now;
        if (symbols.size > 0) {
            console_1.logger.info("ECO_ENGINE", `Found ${symbols.size} AI market maker symbols: ${Array.from(symbols).join(", ")}`);
        }
        return symbols;
    }
    catch (error) {
        console_1.logger.error("ECO_ENGINE", "Failed to get AI market maker symbols", error);
        return new Set();
    }
}
function uuidToString(uuid) {
    try {
        if (typeof uuid === "string") {
            return uuid;
        }
        if (uuid && typeof uuid.toString === "function") {
            return uuid.toString();
        }
        if (uuid === null || uuid === void 0 ? void 0 : uuid.buffer) {
            return (0, uuid_1.stringify)(uuid.buffer);
        }
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid UUID format" });
    }
    catch (error) {
        return "00000000-0000-0000-0000-000000000000";
    }
}
class MatchingEngine {
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
                const instance = new MatchingEngine();
                await instance.init();
                return instance;
            })();
        }
        return this.instancePromise;
    }
    async init() {
        await this.initializeMarkets();
        await this.initializeOrders();
        await this.initializeLastCandles();
        await this.initializeYesterdayCandles();
    }
    async initializeMarkets() {
        const markets = await (0, markets_1.getEcoSystemMarkets)();
        markets.forEach((market) => {
            this.marketsBySymbol[market.symbol] = market;
            this.orderQueue[market.symbol] = [];
        });
    }
    async initializeOrders() {
        try {
            const openOrders = await (0, queries_1.getAllOpenOrders)();
            openOrders.forEach((order) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const createdAt = new Date(order.createdAt);
                const updatedAt = new Date(order.updatedAt);
                if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
                    console_1.logger.error("ECO_ENGINE", "Invalid date in order", new Error("Invalid date in order"));
                    return;
                }
                if (!((_a = order.userId) === null || _a === void 0 ? void 0 : _a.buffer) || !((_b = order.id) === null || _b === void 0 ? void 0 : _b.buffer)) {
                    console_1.logger.error("ECO_ENGINE", "Invalid Uuid in order", new Error("Invalid Uuid in order"));
                    return;
                }
                const userId = uuidToString(order.userId);
                const orderId = uuidToString(order.id);
                if (userId === "00000000-0000-0000-0000-000000000000") {
                    return;
                }
                const marketMakerId = order.marketMakerId ? uuidToString(order.marketMakerId) : undefined;
                const botId = order.botId ? uuidToString(order.botId) : undefined;
                const normalizedOrder = {
                    ...order,
                    amount: BigInt((_c = order.amount) !== null && _c !== void 0 ? _c : 0),
                    price: BigInt((_d = order.price) !== null && _d !== void 0 ? _d : 0),
                    cost: BigInt((_e = order.cost) !== null && _e !== void 0 ? _e : 0),
                    fee: BigInt((_f = order.fee) !== null && _f !== void 0 ? _f : 0),
                    remaining: BigInt((_g = order.remaining) !== null && _g !== void 0 ? _g : 0),
                    filled: BigInt((_h = order.filled) !== null && _h !== void 0 ? _h : 0),
                    createdAt,
                    updatedAt,
                    userId,
                    id: orderId,
                    marketMakerId: marketMakerId !== "00000000-0000-0000-0000-000000000000" ? marketMakerId : undefined,
                    botId: botId !== "00000000-0000-0000-0000-000000000000" ? botId : undefined,
                };
                if (!this.orderQueue[normalizedOrder.symbol]) {
                    this.orderQueue[normalizedOrder.symbol] = [];
                }
                this.orderQueue[normalizedOrder.symbol].push(normalizedOrder);
            });
            await this.processQueue();
        }
        catch (error) {
            console_1.logger.error("ECO_ENGINE", "Failed to populate order queue with open orders", error);
        }
    }
    async syncOrderbookWithOrders() {
        var _a;
        try {
            const aiMarketMakerSymbols = await getAiMarketMakerSymbols(true);
            const allOrderBookEntries = await (0, queries_1.fetchOrderBooks)();
            if (!allOrderBookEntries || allOrderBookEntries.length === 0) {
                return;
            }
            const orderbookBySymbol = {};
            allOrderBookEntries.forEach((entry) => {
                if (!orderbookBySymbol[entry.symbol]) {
                    orderbookBySymbol[entry.symbol] = [];
                }
                orderbookBySymbol[entry.symbol].push(entry);
            });
            let ghostEntriesRemoved = 0;
            for (const symbol in orderbookBySymbol) {
                if (aiMarketMakerSymbols.has(symbol)) {
                    continue;
                }
                const orderbookEntries = orderbookBySymbol[symbol];
                const openOrders = this.orderQueue[symbol] || [];
                const openOrdersByPrice = {};
                for (const order of openOrders) {
                    const priceStr = (0, blockchain_1.fromBigInt)(order.price).toString();
                    if (!openOrdersByPrice[priceStr]) {
                        openOrdersByPrice[priceStr] = { bids: BigInt(0), asks: BigInt(0) };
                    }
                    if (order.side === "BUY") {
                        openOrdersByPrice[priceStr].bids += order.remaining;
                    }
                    else {
                        openOrdersByPrice[priceStr].asks += order.remaining;
                    }
                }
                for (const entry of orderbookEntries) {
                    const priceStr = entry.price.toString();
                    const side = entry.side.toUpperCase();
                    const orderbookAmount = (0, blockchain_1.toBigIntFloat)(Number(entry.amount));
                    const openAmount = ((_a = openOrdersByPrice[priceStr]) === null || _a === void 0 ? void 0 : _a[side === "BIDS" ? "bids" : "asks"]) || BigInt(0);
                    if (orderbookAmount !== openAmount) {
                        if (openAmount === BigInt(0)) {
                            try {
                                const deleteQuery = `DELETE FROM ${client_1.scyllaKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
                                await client_1.default.execute(deleteQuery, [symbol, priceStr, side], { prepare: true });
                                ghostEntriesRemoved++;
                            }
                            catch (deleteError) {
                                console_1.logger.error("ECO_ENGINE", `Failed to remove ghost entry for ${symbol}: ${deleteError.message}`);
                            }
                        }
                        else {
                            try {
                                const updateQuery = `UPDATE ${client_1.scyllaKeyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`;
                                await client_1.default.execute(updateQuery, [(0, blockchain_1.fromBigInt)(openAmount), symbol, priceStr, side], { prepare: true });
                                ghostEntriesRemoved++;
                            }
                            catch (updateError) {
                                console_1.logger.error("ECO_ENGINE", `Failed to fix amount for ${symbol}: ${updateError.message}`);
                            }
                        }
                    }
                }
                for (const priceStr in openOrdersByPrice) {
                    const amounts = openOrdersByPrice[priceStr];
                    if (amounts.bids > BigInt(0)) {
                        const existingEntry = orderbookEntries.find(e => e.price.toString() === priceStr && e.side.toUpperCase() === "BIDS");
                        if (!existingEntry) {
                            try {
                                const insertQuery = `INSERT INTO ${client_1.scyllaKeyspace}.orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)`;
                                await client_1.default.execute(insertQuery, [symbol, priceStr, "BIDS", (0, blockchain_1.fromBigInt)(amounts.bids)], { prepare: true });
                                ghostEntriesRemoved++;
                            }
                            catch (insertError) {
                                console_1.logger.error("ECO_ENGINE", `Failed to add missing BID entry for ${symbol}: ${insertError.message}`);
                            }
                        }
                    }
                    if (amounts.asks > BigInt(0)) {
                        const existingEntry = orderbookEntries.find(e => e.price.toString() === priceStr && e.side.toUpperCase() === "ASKS");
                        if (!existingEntry) {
                            try {
                                const insertQuery = `INSERT INTO ${client_1.scyllaKeyspace}.orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)`;
                                await client_1.default.execute(insertQuery, [symbol, priceStr, "ASKS", (0, blockchain_1.fromBigInt)(amounts.asks)], { prepare: true });
                                ghostEntriesRemoved++;
                            }
                            catch (insertError) {
                                console_1.logger.error("ECO_ENGINE", `Failed to add missing ASK entry for ${symbol}: ${insertError.message}`);
                            }
                        }
                    }
                }
            }
            if (ghostEntriesRemoved > 0) {
                console_1.logger.info("ECO_ENGINE", `Fixed ${ghostEntriesRemoved} orderbook discrepancies`);
                await this.refreshOrderBooks();
            }
        }
        catch (error) {
            console_1.logger.error("ECO_ENGINE", "Orderbook sync failed", error);
        }
    }
    async validateAndCleanOrderbook() {
        var _a, _b, _c, _d;
        try {
            await this.syncOrderbookWithOrders();
            const { getUserEcosystemWalletByCurrency } = await Promise.resolve().then(() => __importStar(require("./matchmaking")));
            const { updateWalletBalance } = await Promise.resolve().then(() => __importStar(require("./wallet")));
            let totalOrdersChecked = 0;
            let ordersFixed = 0;
            let invalidOrdersCancelled = 0;
            for (const symbol in this.orderQueue) {
                if (!symbol || symbol === 'undefined' || !symbol.includes('/')) {
                    continue;
                }
                const orders = this.orderQueue[symbol];
                const [baseCurrency, quoteCurrency] = symbol.split("/");
                const invalidOrders = [];
                for (const order of orders) {
                    totalOrdersChecked++;
                    try {
                        if (order.marketMakerId) {
                            continue;
                        }
                        const orderAmount = (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(order.remaining));
                        const fillRatio = Number(order.remaining) / Number(order.amount);
                        const orderCost = (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(order.cost)) * fillRatio;
                        if (order.side === "SELL") {
                            const sellerWallet = await getUserEcosystemWalletByCurrency(order.userId, baseCurrency);
                            if (!sellerWallet) {
                                console_1.logger.warn("ECO_ENGINE", `Wallet not found for user ${order.userId}, currency ${baseCurrency}`);
                                invalidOrders.push(order);
                                continue;
                            }
                            const sellerInOrder = parseFloat(((_a = sellerWallet.inOrder) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
                            const sellerBalance = parseFloat(((_b = sellerWallet.balance) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
                            if (sellerInOrder < orderAmount) {
                                const availableBalance = sellerBalance - sellerInOrder;
                                if (availableBalance >= orderAmount) {
                                    try {
                                        const idempotencyKey = `eco_order_lock_${order.id}_${sellerWallet.id}`;
                                        await updateWalletBalance(sellerWallet, orderAmount, "subtract", idempotencyKey);
                                        ordersFixed++;
                                    }
                                    catch (lockError) {
                                        console_1.logger.error("ECO_ENGINE", `Failed to lock funds for ${symbol}: ${lockError.message}`);
                                        invalidOrders.push(order);
                                    }
                                }
                                else {
                                    invalidOrders.push(order);
                                }
                            }
                        }
                        else if (order.side === "BUY") {
                            const buyerWallet = await getUserEcosystemWalletByCurrency(order.userId, quoteCurrency);
                            if (!buyerWallet) {
                                console_1.logger.warn("ECO_ENGINE", `Wallet not found for user ${order.userId}, currency ${quoteCurrency}`);
                                invalidOrders.push(order);
                                continue;
                            }
                            const buyerInOrder = parseFloat(((_c = buyerWallet.inOrder) === null || _c === void 0 ? void 0 : _c.toString()) || "0");
                            const buyerBalance = parseFloat(((_d = buyerWallet.balance) === null || _d === void 0 ? void 0 : _d.toString()) || "0");
                            if (buyerInOrder < orderCost) {
                                const availableBalance = buyerBalance - buyerInOrder;
                                if (availableBalance >= orderCost) {
                                    try {
                                        const idempotencyKey = `eco_order_lock_${order.id}_${buyerWallet.id}`;
                                        await updateWalletBalance(buyerWallet, orderCost, "subtract", idempotencyKey);
                                        ordersFixed++;
                                    }
                                    catch (lockError) {
                                        console_1.logger.error("ECO_ENGINE", `Failed to lock funds for ${symbol}: ${lockError.message}`);
                                        invalidOrders.push(order);
                                    }
                                }
                                else {
                                    invalidOrders.push(order);
                                }
                            }
                        }
                    }
                    catch (error) {
                        console_1.logger.error("ECO_ENGINE", `Error validating order ${order.id}: ${error.message}`);
                        invalidOrders.push(order);
                    }
                }
                if (invalidOrders.length > 0) {
                    for (const order of invalidOrders) {
                        try {
                            const { cancelOrderByUuid } = await Promise.resolve().then(() => __importStar(require("./scylla/queries")));
                            await cancelOrderByUuid(order.userId, order.id, order.createdAt.toISOString(), order.symbol, order.price, order.side, order.remaining);
                            const index = this.orderQueue[symbol].indexOf(order);
                            if (index > -1) {
                                this.orderQueue[symbol].splice(index, 1);
                            }
                            await (0, ws_1.handleOrderBroadcast)({
                                ...order,
                                status: "CANCELLED",
                            });
                            invalidOrdersCancelled++;
                        }
                        catch (cancelError) {
                            console_1.logger.error("ECO_ENGINE", `Failed to cancel order for ${symbol}: ${cancelError.message}`);
                        }
                    }
                }
            }
            if (ordersFixed > 0 || invalidOrdersCancelled > 0) {
                console_1.logger.info("ECO_ENGINE", `Fixed ${ordersFixed} orders, cancelled ${invalidOrdersCancelled} invalid orders`);
            }
            if (ordersFixed > 0 || invalidOrdersCancelled > 0) {
                await this.refreshOrderBooks();
                if (ordersFixed > 0) {
                    for (const symbol in this.orderQueue) {
                        this.orderQueue[symbol] = [];
                    }
                    const openOrders = await (0, queries_1.getAllOpenOrders)();
                    const uuidStringify = await Promise.resolve().then(() => __importStar(require("uuid"))).then(m => m.stringify);
                    openOrders.forEach((order) => {
                        var _a, _b, _c, _d, _e, _f, _g, _h;
                        const createdAt = new Date(order.createdAt);
                        const updatedAt = new Date(order.updatedAt);
                        if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime()))
                            return;
                        if (!((_a = order.userId) === null || _a === void 0 ? void 0 : _a.buffer) || !((_b = order.id) === null || _b === void 0 ? void 0 : _b.buffer))
                            return;
                        const normalizedOrder = {
                            ...order,
                            amount: BigInt((_c = order.amount) !== null && _c !== void 0 ? _c : 0),
                            price: BigInt((_d = order.price) !== null && _d !== void 0 ? _d : 0),
                            cost: BigInt((_e = order.cost) !== null && _e !== void 0 ? _e : 0),
                            fee: BigInt((_f = order.fee) !== null && _f !== void 0 ? _f : 0),
                            remaining: BigInt((_g = order.remaining) !== null && _g !== void 0 ? _g : 0),
                            filled: BigInt((_h = order.filled) !== null && _h !== void 0 ? _h : 0),
                            createdAt,
                            updatedAt,
                            userId: uuidStringify(order.userId.buffer),
                            id: uuidStringify(order.id.buffer),
                        };
                        if (!this.orderQueue[normalizedOrder.symbol]) {
                            this.orderQueue[normalizedOrder.symbol] = [];
                        }
                        this.orderQueue[normalizedOrder.symbol].push(normalizedOrder);
                    });
                    await this.processQueue();
                }
            }
        }
        catch (error) {
            console_1.logger.error("ECO_ENGINE", "Orderbook validation failed", error);
        }
    }
    async refreshOrderBooks() {
        try {
            const allOrderBookEntries = await (0, queries_1.fetchOrderBooks)();
            const mappedOrderBook = {};
            allOrderBookEntries === null || allOrderBookEntries === void 0 ? void 0 : allOrderBookEntries.forEach((entry) => {
                if (!mappedOrderBook[entry.symbol]) {
                    mappedOrderBook[entry.symbol] = { bids: {}, asks: {} };
                }
                mappedOrderBook[entry.symbol][entry.side.toLowerCase()][(0, blockchain_1.removeTolerance)((0, blockchain_1.toBigIntFloat)(Number(entry.price))).toString()] = (0, blockchain_1.removeTolerance)((0, blockchain_1.toBigIntFloat)(Number(entry.amount)));
            });
            for (const symbol in mappedOrderBook) {
                await (0, ws_1.handleOrderBookBroadcast)(symbol, mappedOrderBook[symbol]);
            }
        }
        catch (error) {
            console_1.logger.error("ECO_ENGINE", `Failed to refresh orderbooks: ${error}`);
        }
    }
    async initializeLastCandles() {
        try {
            const lastCandles = await (0, queries_1.getLastCandles)();
            lastCandles.forEach((candle) => {
                if (!this.lastCandle[candle.symbol]) {
                    this.lastCandle[candle.symbol] = {};
                }
                this.lastCandle[candle.symbol][candle.interval] = candle;
            });
        }
        catch (error) {
            console_1.logger.error("ECO_ENGINE", "Failed to initialize last candles", error);
        }
    }
    async initializeYesterdayCandles() {
        try {
            const yesterdayCandles = await (0, queries_1.getYesterdayCandles)();
            Object.keys(yesterdayCandles).forEach((symbol) => {
                const candles = yesterdayCandles[symbol];
                if (candles.length > 0) {
                    this.yesterdayCandle[symbol] = candles[0];
                }
            });
        }
        catch (error) {
            console_1.logger.error("ECO_ENGINE", "Failed to initialize yesterday's candles", error);
        }
    }
    async processQueue() {
        const ordersToUpdate = [];
        const orderBookUpdates = {};
        const allOrderBookEntries = await (0, queries_1.fetchOrderBooks)();
        const mappedOrderBook = {};
        allOrderBookEntries === null || allOrderBookEntries === void 0 ? void 0 : allOrderBookEntries.forEach((entry) => {
            if (!mappedOrderBook[entry.symbol]) {
                mappedOrderBook[entry.symbol] = { bids: {}, asks: {} };
            }
            mappedOrderBook[entry.symbol][entry.side.toLowerCase()][(0, blockchain_1.removeTolerance)((0, blockchain_1.toBigIntFloat)(Number(entry.price))).toString()] = (0, blockchain_1.removeTolerance)((0, blockchain_1.toBigIntFloat)(Number(entry.amount)));
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
            const currentOrderBook = mappedOrderBook[symbol] || { bids: {}, asks: {} };
            finalOrderBooks[symbol] = (0, orderbook_1.applyUpdatesToOrderBook)(currentOrderBook, orderBookUpdates[symbol]);
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
            console_1.logger.warn("ECO_ENGINE", "Couldn't obtain a lock on all orders, skipping this batch.");
            return;
        }
        const updateQueries = [];
        const orderUpdateQueries = await (0, queries_1.generateOrderUpdateQueries)(ordersToUpdate);
        updateQueries.push(...orderUpdateQueries);
        const latestOrdersForCandles = (0, candles_1.getLatestOrdersForCandles)(ordersToUpdate);
        for (const order of latestOrdersForCandles) {
            const candleQueries = await this.updateLastCandles(order);
            updateQueries.push(...candleQueries);
        }
        const orderBookQueries = (0, orderbook_1.generateOrderBookUpdateQueries)(orderBookUpdates);
        updateQueries.push(...orderBookQueries);
        if (updateQueries.length > 0) {
            try {
                await client_1.default.batch(updateQueries, { prepare: true });
            }
            catch (error) {
                console_1.logger.error("ECO_ENGINE", "Failed to batch update", error);
            }
        }
        else {
            console_1.logger.warn("ECO_ENGINE", "No queries to batch update.");
        }
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
            console_1.logger.error("ECO_ENGINE", "Invalid date in order", new Error("Invalid date in order"));
            return;
        }
        if (!this.orderQueue[order.symbol]) {
            this.orderQueue[order.symbol] = [];
        }
        this.orderQueue[order.symbol].push(order);
        const symbolOrderBook = await (0, orderbook_1.updateSingleOrderBook)(order, "add");
        (0, ws_1.handleOrderBookBroadcast)(order.symbol, symbolOrderBook);
        await this.processQueue();
    }
    async updateLastCandles(order) {
        let finalPrice = BigInt(0);
        let trades;
        try {
            trades = JSON.parse(order.trades);
        }
        catch (error) {
            console_1.logger.error("ECO_ENGINE", "Failed to parse trades", error);
            return [];
        }
        if (trades &&
            trades.length > 0 &&
            trades[trades.length - 1].price !== undefined) {
            finalPrice = (0, blockchain_1.toBigIntFloat)(trades[trades.length - 1].price);
        }
        else if (order.price !== undefined) {
            finalPrice = order.price;
        }
        else {
            console_1.logger.error("ECO_ENGINE", "Neither trade prices nor order price are available", new Error("Neither trade prices nor order price are available"));
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
        const normalizedCurrentTime = (0, ws_1.normalizeTimeToInterval)(new Date().getTime(), interval);
        const normalizedLastCandleTime = existingLastCandle
            ? (0, ws_1.normalizeTimeToInterval)(new Date(existingLastCandle.createdAt).getTime(), interval)
            : null;
        const shouldCreateNewCandle = !existingLastCandle || normalizedCurrentTime !== normalizedLastCandleTime;
        if (shouldCreateNewCandle) {
            let newOpenPrice;
            if (existingLastCandle) {
                newOpenPrice = existingLastCandle.close;
            }
            else {
                const dbCandle = await (0, queries_1.getLatestCandleForSymbol)(order.symbol, interval);
                if (dbCandle) {
                    newOpenPrice = dbCandle.close;
                    if (!this.lastCandle[order.symbol]) {
                        this.lastCandle[order.symbol] = {};
                    }
                    this.lastCandle[order.symbol][interval] = dbCandle;
                }
                else {
                    newOpenPrice = (0, blockchain_1.fromBigInt)(finalPrice);
                }
            }
            if (!newOpenPrice && newOpenPrice !== 0) {
                return null;
            }
            const finalPriceNumber = (0, blockchain_1.fromBigInt)(finalPrice);
            const normalizedTime = new Date((0, ws_1.normalizeTimeToInterval)(new Date().getTime(), interval));
            const newLastCandle = {
                symbol: order.symbol,
                interval,
                open: newOpenPrice,
                high: Math.max(newOpenPrice, finalPriceNumber),
                low: Math.min(newOpenPrice, finalPriceNumber),
                close: finalPriceNumber,
                volume: (0, blockchain_1.fromBigInt)(order.amount),
                createdAt: normalizedTime,
                updatedAt: new Date(),
            };
            if (!this.lastCandle[order.symbol]) {
                this.lastCandle[order.symbol] = {};
            }
            this.lastCandle[order.symbol][interval] = newLastCandle;
            return {
                query: `INSERT INTO candles (symbol, interval, "createdAt", "updatedAt", open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            let updateQuery = `UPDATE candles SET "updatedAt" = ?, close = ?`;
            const now = new Date();
            const finalPriceNumber = (0, blockchain_1.fromBigInt)(finalPrice);
            const updateParams = [now, finalPriceNumber];
            const newVolume = existingLastCandle.volume + (0, blockchain_1.fromBigInt)(order.amount);
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
        for (const symbol in finalOrderBooks) {
            updatePromises.push(this.createOrderBookUpdatePromise(symbol, finalOrderBooks[symbol]));
            updatePromises.push(...this.createCandleBroadcastPromises(symbol));
        }
        await Promise.all(updatePromises);
    }
    createOrderBookUpdatePromise(symbol, finalOrderBookState) {
        return (0, ws_1.handleOrderBookBroadcast)(symbol, finalOrderBookState);
    }
    createCandleBroadcastPromises(symbol) {
        const promises = [];
        if (this.lastCandle[symbol]) {
            for (const interval in this.lastCandle[symbol]) {
                promises.push((0, ws_1.handleCandleBroadcast)(symbol, interval, this.lastCandle[symbol][interval]));
            }
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
        const updatedOrderBook = await (0, orderbook_1.fetchExistingAmounts)(symbol);
        (0, ws_1.handleOrderBookBroadcast)(symbol, updatedOrderBook);
        await this.processQueue();
    }
    getTickers() {
        const symbolsWithTickers = {};
        for (const symbol in this.lastCandle) {
            const ticker = this.getTicker(symbol);
            if (ticker.last !== 0) {
                symbolsWithTickers[symbol] = ticker;
            }
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
exports.MatchingEngine = MatchingEngine;
MatchingEngine.instancePromise = null;
