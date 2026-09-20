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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.getOrdersByUserId = getOrdersByUserId;
exports.getOrderByUuid = getOrderByUuid;
exports.cancelOrderByUuid = cancelOrderByUuid;
exports.getOrderbookEntry = getOrderbookEntry;
exports.createOrder = createOrder;
exports.addOrderToMatchingQueue = addOrderToMatchingQueue;
exports.getHistoricalCandles = getHistoricalCandles;
exports.getOrderBook = getOrderBook;
exports.getAllOpenOrders = getAllOpenOrders;
exports.getLastCandles = getLastCandles;
exports.getLatestCandleForSymbol = getLatestCandleForSymbol;
exports.getYesterdayCandles = getYesterdayCandles;
exports.generateOrderUpdateQueries = generateOrderUpdateQueries;
exports.fetchOrderBooks = fetchOrderBooks;
exports.updateOrderBookInDB = updateOrderBookInDB;
exports.deleteAllMarketData = deleteAllMarketData;
exports.getOrders = getOrders;
exports.rollbackOrderCreation = rollbackOrderCreation;
exports.getRecentTrades = getRecentTrades;
exports.insertTrade = insertTrade;
exports.getOHLCV = getOHLCV;
const blockchain_1 = require("../blockchain");
const client_1 = __importDefault(require("./client"));
const cassandra_driver_1 = require("cassandra-driver");
const passwords_1 = require("@b/utils/passwords");
const matchingEngine_1 = require("../matchingEngine");
const wallet_1 = require("../wallet");
const tokens_1 = require("../tokens");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
const tokenDecimalsCache = new Map();
function getToleranceDigits(decimals) {
    return 18 - decimals;
}
async function getSymbolDecimals(symbol) {
    var _a;
    const [baseCurrency, quoteCurrency] = symbol.split("/");
    if (tokenDecimalsCache.has(symbol)) {
        return tokenDecimalsCache.get(symbol);
    }
    try {
        const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
        const market = await models.ecosystemMarket.findOne({
            where: { currency: baseCurrency, pair: quoteCurrency },
            attributes: ["metadata"],
        });
        if (market) {
            const metadata = market.metadata;
            if (((_a = metadata === null || metadata === void 0 ? void 0 : metadata.precision) === null || _a === void 0 ? void 0 : _a.amount) !== undefined) {
                const decimals = Number(metadata.precision.amount);
                tokenDecimalsCache.set(symbol, decimals);
                return decimals;
            }
        }
        const commonChains = ['ETH', 'BSC', 'MATIC', 'BTC', 'SOL'];
        for (const chain of commonChains) {
            try {
                const token = await (0, tokens_1.getEcosystemToken)(chain, baseCurrency);
                if (token && token.decimals !== undefined) {
                    tokenDecimalsCache.set(symbol, token.decimals);
                    return token.decimals;
                }
            }
            catch (e) {
                continue;
            }
        }
        console_1.logger.warn("SCYLLA", `Could not find decimals for ${symbol}, defaulting to 8`);
        tokenDecimalsCache.set(symbol, 8);
        return 8;
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Error fetching decimals for ${symbol}`, error);
        return 8;
    }
}
async function query(q, params = []) {
    return client_1.default.execute(q, params, { prepare: true });
}
async function getOrdersByUserId(userId) {
    const query = `
    SELECT * FROM ${scyllaKeyspace}.orders
    WHERE "userId" = ?
    ORDER BY "createdAt" DESC;
  `;
    const params = [userId];
    try {
        const result = await client_1.default.execute(query, params, { prepare: true });
        const orders = result.rows.map(mapRowToOrder);
        return orders;
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch orders by userId: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch orders by userId: ${error.message}` });
    }
}
function mapRowToOrder(row) {
    return {
        id: row.id,
        userId: row.userId,
        symbol: row.symbol,
        type: row.type,
        side: row.side,
        price: row.price,
        amount: row.amount,
        filled: row.filled,
        remaining: row.remaining,
        timeInForce: row.timeInForce,
        cost: row.cost,
        fee: row.fee,
        feeCurrency: row.feeCurrency,
        average: row.average,
        trades: row.trades,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        marketMakerId: row.marketMakerId,
        botId: row.botId,
        walletType: row.walletType || "ECO",
    };
}
function getOrderByUuid(userId, id, createdAt) {
    const query = `
    SELECT * FROM ${scyllaKeyspace}.orders
    WHERE "userId" = ? AND id = ? AND "createdAt" = ?;
  `;
    const params = [userId, id, createdAt];
    return client_1.default
        .execute(query, params, { prepare: true })
        .then((result) => result.rows[0])
        .then(mapRowToOrder);
}
async function cancelOrderByUuid(userId, id, createdAt, symbol, price, side, amount) {
    const checkQuery = `
    SELECT id, symbol, status FROM ${scyllaKeyspace}.orders
    WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
  `;
    const checkParams = [userId, new Date(createdAt), id];
    try {
        const checkResult = await client_1.default.execute(checkQuery, checkParams, { prepare: true });
        if (checkResult.rows.length === 0) {
            console_1.logger.debug("SCYLLA", `Order ${id} not found for user ${userId} at ${createdAt} - skipping cancellation (likely already filled)`);
            return;
        }
        const existingOrder = checkResult.rows[0];
        if (existingOrder.status === "CANCELED" || existingOrder.status === "CLOSED") {
            console_1.logger.debug("SCYLLA", `Order ${id} is already ${existingOrder.status} - skipping`);
            return;
        }
    }
    catch (checkError) {
        console_1.logger.error("SCYLLA", `Failed to check order existence: ${checkError.message}`, checkError);
        throw checkError;
    }
    const priceFormatted = (0, blockchain_1.fromBigInt)(price);
    const orderbookSide = side === "BUY" ? "BIDS" : "ASKS";
    const orderbookAmount = await getOrderbookEntry(symbol, priceFormatted, orderbookSide);
    let orderbookQuery = "";
    let orderbookParams = [];
    if (orderbookAmount) {
        const newAmount = orderbookAmount - amount;
        if (newAmount <= BigInt(0)) {
            orderbookQuery = `DELETE FROM ${scyllaKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
            orderbookParams = [symbol, priceFormatted.toString(), orderbookSide];
        }
        else {
            orderbookQuery = `UPDATE ${scyllaKeyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`;
            orderbookParams = [
                (0, blockchain_1.fromBigInt)(newAmount).toString(),
                symbol,
                priceFormatted.toString(),
                orderbookSide,
            ];
        }
    }
    else {
        if (process.env.NODE_ENV === "development") {
            console_1.logger.debug("SCYLLA", `No orderbook entry found for symbol: ${symbol}, price: ${priceFormatted}, side: ${orderbookSide}`);
        }
    }
    const currentTimestamp = new Date();
    const updateOrderQuery = `
    UPDATE ${scyllaKeyspace}.orders
    SET status = 'CANCELED', "updatedAt" = ?
    WHERE "userId" = ? AND id = ? AND "createdAt" = ?;
  `;
    const updateOrderParams = [currentTimestamp, userId, id, new Date(createdAt)];
    const batchQueries = orderbookQuery
        ? [
            { query: orderbookQuery, params: orderbookParams },
            { query: updateOrderQuery, params: updateOrderParams },
        ]
        : [{ query: updateOrderQuery, params: updateOrderParams }];
    try {
        await client_1.default.batch(batchQueries, { prepare: true });
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to cancel order and update orderbook: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to cancel order and update orderbook: ${error.message}` });
    }
}
async function getOrderbookEntry(symbol, price, side) {
    const query = `
    SELECT * FROM ${scyllaKeyspace}.orderbook
    WHERE symbol = ? AND price = ? AND side = ?;
  `;
    const params = [symbol, price, side];
    try {
        const result = await client_1.default.execute(query, params, { prepare: true });
        if (result.rows.length > 0) {
            const row = result.rows[0];
            return (0, blockchain_1.toBigIntFloat)(row["amount"]);
        }
        else {
            return null;
        }
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch orderbook entry: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch orderbook entry: ${error.message}` });
    }
}
async function createOrder({ userId, symbol, amount, price, cost, type, side, fee, feeCurrency, marketMakerId, botId, walletType = "ECO", }) {
    if (!userId || typeof userId !== 'string') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: userId is required and must be a valid string' });
    }
    if (!symbol || typeof symbol !== 'string') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: symbol is required and must be a valid string' });
    }
    if (!type || typeof type !== 'string') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: type is required and must be a valid string' });
    }
    if (!side || typeof side !== 'string') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: side is required and must be a valid string' });
    }
    if (!feeCurrency || typeof feeCurrency !== 'string') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: feeCurrency is required and must be a valid string' });
    }
    if (typeof price !== 'bigint') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: price is required and must be a bigint' });
    }
    if (typeof amount !== 'bigint') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: amount is required and must be a bigint' });
    }
    if (typeof cost !== 'bigint') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: cost is required and must be a bigint' });
    }
    if (typeof fee !== 'bigint') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Cannot create order: fee is required and must be a bigint' });
    }
    const currentTimestamp = new Date();
    const query = `
    INSERT INTO ${scyllaKeyspace}.orders (id, "userId", symbol, type, "timeInForce", side, price, amount, filled, remaining, cost, fee, "feeCurrency", status, "createdAt", "updatedAt", "marketMakerId", "botId", "walletType")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
    const priceTolerance = (0, blockchain_1.removeTolerance)(price);
    const amountTolerance = (0, blockchain_1.removeTolerance)(amount);
    const costTolerance = (0, blockchain_1.removeTolerance)(cost);
    const feeTolerance = (0, blockchain_1.removeTolerance)(fee);
    const id = (0, passwords_1.makeUuid)();
    const params = [
        id,
        userId,
        symbol,
        type,
        "GTC",
        side,
        priceTolerance.toString(),
        amountTolerance.toString(),
        "0",
        amountTolerance.toString(),
        costTolerance.toString(),
        feeTolerance.toString(),
        feeCurrency,
        "OPEN",
        currentTimestamp,
        currentTimestamp,
        marketMakerId || null,
        botId || null,
        walletType,
    ];
    try {
        await client_1.default.execute(query, params, {
            prepare: true,
        });
        const newOrder = {
            id,
            userId,
            symbol,
            type,
            timeInForce: "GTC",
            side,
            price: priceTolerance,
            amount: amountTolerance,
            filled: BigInt(0),
            remaining: amountTolerance,
            cost: costTolerance,
            fee: feeTolerance,
            feeCurrency,
            average: BigInt(0),
            trades: "",
            status: "OPEN",
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
            marketMakerId,
            botId,
            walletType,
        };
        return newOrder;
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to create order: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to create order: ${error.message}` });
    }
}
async function addOrderToMatchingQueue(order) {
    const matchingEngine = await matchingEngine_1.MatchingEngine.getInstance();
    matchingEngine.addToQueue(order);
}
async function getHistoricalCandles(symbol, interval, from, to) {
    try {
        const query = `
      SELECT * FROM ${scyllaKeyspace}.candles
      WHERE symbol = ?
      AND interval = ?
      AND "createdAt" >= ?
      AND "createdAt" <= ?
      ORDER BY "createdAt" ASC;
    `;
        const params = [symbol, interval, new Date(from), new Date(to)];
        const result = await client_1.default.execute(query, params, { prepare: true });
        let candles = result.rows.map((row) => [
            row.createdAt.getTime(),
            row.open,
            row.high,
            row.low,
            row.close,
            row.volume,
        ]);
        const { fillCandleGaps, intervalDurations, normalizeToIntervalBoundary, } = await Promise.resolve().then(() => __importStar(require("../candles")));
        const intervalDuration = intervalDurations[interval] || 60000;
        if (candles.length === 0) {
            const lookbackQuery = `
        SELECT * FROM ${scyllaKeyspace}.candles
        WHERE symbol = ?
        AND interval = ?
        AND "createdAt" < ?
        ORDER BY "createdAt" DESC
        LIMIT 1;
      `;
            const lookbackParams = [symbol, interval, new Date(from)];
            const lookbackResult = await client_1.default.execute(lookbackQuery, lookbackParams, {
                prepare: true,
            });
            if (lookbackResult.rows.length > 0) {
                const lastKnownCandle = lookbackResult.rows[0];
                const lastKnownTime = lastKnownCandle.createdAt.getTime();
                const lastKnownClose = lastKnownCandle.close;
                const normalizedLastKnown = normalizeToIntervalBoundary(lastKnownTime, interval);
                const filledCandles = [];
                let fillTime = normalizedLastKnown + intervalDuration;
                const maxGapsToFill = 500;
                let gapsFilled = 0;
                while (fillTime <= to && gapsFilled < maxGapsToFill) {
                    filledCandles.push([
                        fillTime,
                        lastKnownClose,
                        lastKnownClose,
                        lastKnownClose,
                        lastKnownClose,
                        0,
                    ]);
                    fillTime += intervalDuration;
                    gapsFilled++;
                }
                return filledCandles;
            }
            return [];
        }
        candles = fillCandleGaps(candles, interval, from, to, 500);
        return candles;
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch historical candles: ${error.message}` });
    }
}
async function getOrderBook(symbol) {
    const askQuery = `
    SELECT * FROM ${scyllaKeyspace}.orderbook
    WHERE symbol = ? AND side = 'ASKS'
    LIMIT 50;
  `;
    const bidQuery = `
    SELECT * FROM ${scyllaKeyspace}.orderbook
    WHERE symbol = ? AND side = 'BIDS'
    ORDER BY price DESC
    LIMIT 50;
  `;
    const [askRows, bidRows] = await Promise.all([
        client_1.default.execute(askQuery, [symbol], { prepare: true }),
        client_1.default.execute(bidQuery, [symbol], { prepare: true }),
    ]);
    const asks = askRows.rows.map((row) => [row.price, row.amount]);
    const bids = bidRows.rows.map((row) => [row.price, row.amount]);
    return { asks, bids };
}
async function getAllOpenOrders() {
    const symbolsQuery = `
    SELECT DISTINCT symbol, side FROM ${scyllaKeyspace}.orderbook;
  `;
    try {
        const symbolsResult = await client_1.default.execute(symbolsQuery, [], { prepare: true });
        const uniqueSymbols = new Set();
        symbolsResult.rows.forEach(row => {
            if (row.symbol) {
                uniqueSymbols.add(row.symbol);
            }
        });
        const symbols = Array.from(uniqueSymbols);
        if (symbols.length === 0) {
            return [];
        }
        const allOrders = [];
        for (const symbol of symbols) {
            const query = `
        SELECT * FROM ${scyllaKeyspace}.orders
        WHERE status = 'OPEN' AND symbol = ?
        ALLOW FILTERING;
      `;
            try {
                const result = await client_1.default.execute(query, [symbol], { prepare: true });
                allOrders.push(...result.rows);
            }
            catch (err) {
                console_1.logger.warn("SCYLLA", `Failed to fetch open orders for symbol ${symbol}: ${err.message}`);
            }
        }
        return allOrders;
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch all open orders: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch all open orders: ${error.message}` });
    }
}
async function getLastCandles() {
    try {
        const query = `
      SELECT symbol, interval, open, high, low, close, volume, "createdAt", "updatedAt"
      FROM ${scyllaKeyspace}.latest_candles;
    `;
        const result = await client_1.default.execute(query, [], { prepare: true });
        const latestByKey = {};
        result.rows.forEach((row) => {
            const key = `${row.symbol}:${row.interval}`;
            const candle = {
                symbol: row.symbol,
                interval: row.interval,
                open: row.open,
                high: row.high,
                low: row.low,
                close: row.close,
                volume: row.volume,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
            };
            if (!latestByKey[key] || candle.createdAt > latestByKey[key].createdAt) {
                latestByKey[key] = candle;
            }
        });
        return Object.values(latestByKey);
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch latest candles: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch latest candles: ${error.message}` });
    }
}
async function getLatestCandleForSymbol(symbol, interval) {
    try {
        const query = `
      SELECT symbol, interval, open, high, low, close, volume, "createdAt", "updatedAt"
      FROM ${scyllaKeyspace}.latest_candles
      WHERE symbol = ? AND interval = ?
      LIMIT 1;
    `;
        const result = await client_1.default.execute(query, [symbol, interval], { prepare: true });
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            symbol: row.symbol,
            interval: row.interval,
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            volume: row.volume,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        };
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch latest candle for ${symbol}/${interval}: ${error.message}`, error);
        return null;
    }
}
async function getYesterdayCandles() {
    try {
        const endOfYesterday = new Date();
        endOfYesterday.setHours(0, 0, 0, 0);
        const startOfYesterday = new Date(endOfYesterday.getTime() - 24 * 60 * 60 * 1000);
        const query = `
      SELECT * FROM ${scyllaKeyspace}.latest_candles
      WHERE "createdAt" >= ? AND "createdAt" < ?;
    `;
        const result = await client_1.default.execute(query, [startOfYesterday.toISOString(), endOfYesterday.toISOString()], { prepare: true });
        const yesterdayCandles = {};
        for (const row of result.rows) {
            if (row.interval !== "1d") {
                continue;
            }
            const candle = {
                symbol: row.symbol,
                interval: row.interval,
                open: row.open,
                high: row.high,
                low: row.low,
                close: row.close,
                volume: row.volume,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
            };
            if (!yesterdayCandles[row.symbol]) {
                yesterdayCandles[row.symbol] = [];
            }
            yesterdayCandles[row.symbol].push(candle);
        }
        return yesterdayCandles;
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch yesterday's candles: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch yesterday's candles: ${error.message}` });
    }
}
async function generateOrderUpdateQueries(ordersToUpdate) {
    const symbols = [...new Set(ordersToUpdate.map(order => order.symbol))];
    const decimalsMap = new Map();
    await Promise.all(symbols.map(async (symbol) => {
        const decimals = await getSymbolDecimals(symbol);
        decimalsMap.set(symbol, decimals);
    }));
    const queries = ordersToUpdate.map((order) => {
        const decimals = decimalsMap.get(order.symbol) || 8;
        const toleranceDigits = getToleranceDigits(decimals);
        return {
            query: `
        UPDATE ${scyllaKeyspace}.orders
        SET filled = ?, remaining = ?, status = ?, "updatedAt" = ?, trades = ?
        WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
      `,
            params: [
                (0, blockchain_1.removeTolerance)(order.filled, toleranceDigits).toString(),
                (0, blockchain_1.removeTolerance)(order.remaining, toleranceDigits).toString(),
                order.status,
                new Date(),
                JSON.stringify(order.trades),
                order.userId,
                order.createdAt,
                order.id,
            ],
        };
    });
    return queries;
}
async function fetchOrderBooks() {
    const query = `
    SELECT * FROM ${scyllaKeyspace}.orderbook;
  `;
    try {
        const result = await client_1.default.execute(query);
        return result.rows.map((row) => ({
            symbol: row.symbol,
            price: row.price,
            amount: row.amount,
            side: row.side,
        }));
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch order books: ${error.message}`, error);
        return null;
    }
}
async function updateOrderBookInDB(symbol, price, amount, side) {
    let query;
    let params;
    if (amount > 0) {
        query = `
      INSERT INTO ${scyllaKeyspace}.orderbook (symbol, price, amount, side)
      VALUES (?, ?, ?, ?);
    `;
        params = [symbol, price, amount, side.toUpperCase()];
    }
    else {
        query = `
      DELETE FROM ${scyllaKeyspace}.orderbook
      WHERE symbol = ? AND price = ? AND side = ?;
    `;
        params = [symbol, price, side.toUpperCase()];
    }
    try {
        await client_1.default.execute(query, params, { prepare: true });
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to update order book: ${error.message}`, error);
    }
}
async function deleteAllMarketData(symbol) {
    const ordersResult = await client_1.default.execute(`
      SELECT "userId", "createdAt", id
      FROM ${scyllaKeyspace}.orders_by_symbol
      WHERE symbol = ?
      ALLOW FILTERING;
    `, [symbol], { prepare: true });
    for (const row of ordersResult.rows) {
        await cancelAndRefundOrder(row.userId, row.id, row.createdAt);
    }
    const deleteOrdersQueries = ordersResult.rows.map((row) => ({
        query: `
      DELETE FROM ${scyllaKeyspace}.orders
      WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
    `,
        params: [row.userId, row.createdAt, row.id],
    }));
    const candlesResult = await client_1.default.execute(`
      SELECT interval, "createdAt"
      FROM ${scyllaKeyspace}.candles
      WHERE symbol = ?;
    `, [symbol], { prepare: true });
    const deleteCandlesQueries = candlesResult.rows.map((row) => ({
        query: `
      DELETE FROM ${scyllaKeyspace}.candles
      WHERE symbol = ? AND interval = ? AND "createdAt" = ?;
    `,
        params: [symbol, row.interval, row.createdAt],
    }));
    const sides = ["ASKS", "BIDS"];
    const deleteOrderbookQueries = [];
    for (const side of sides) {
        const orderbookResult = await client_1.default.execute(`
        SELECT price
        FROM ${scyllaKeyspace}.orderbook
        WHERE symbol = ? AND side = ?;
      `, [symbol, side], { prepare: true });
        const queries = orderbookResult.rows.map((row) => ({
            query: `
        DELETE FROM ${scyllaKeyspace}.orderbook
        WHERE symbol = ? AND side = ? AND price = ?;
      `,
            params: [symbol, side, row.price],
        }));
        deleteOrderbookQueries.push(...queries);
    }
    const batchQueries = [
        ...deleteOrdersQueries,
        ...deleteCandlesQueries,
        ...deleteOrderbookQueries,
    ];
    if (batchQueries.length === 0) {
        return;
    }
    try {
        await client_1.default.batch(batchQueries, { prepare: true });
    }
    catch (err) {
        console_1.logger.error("SCYLLA", `Failed to delete all market data: ${err.message}`, err);
    }
}
async function cancelAndRefundOrder(userId, id, createdAt) {
    const order = await getOrderByUuid(userId, id, createdAt);
    if (!order) {
        console_1.logger.warn("SCYLLA", `Order not found for UUID: ${id}`);
        return;
    }
    if (order.status !== "OPEN" || BigInt(order.remaining) === BigInt(0)) {
        return;
    }
    const refundAmount = order.side === "BUY"
        ? (0, blockchain_1.fromBigIntMultiply)(BigInt(order.remaining) + BigInt(order.fee), BigInt(order.price))
        : (0, blockchain_1.fromBigInt)(BigInt(order.remaining) + BigInt(order.fee));
    const walletCurrency = order.side === "BUY"
        ? order.symbol.split("/")[1]
        : order.symbol.split("/")[0];
    const wallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(userId, walletCurrency);
    if (!wallet) {
        console_1.logger.warn("SCYLLA", `${walletCurrency} wallet not found for user ID: ${userId}`);
        return;
    }
    const idempotencyKey = `eco_order_refund_${id}_${wallet.id}`;
    await (0, wallet_1.updateWalletBalance)(wallet, refundAmount, "add", idempotencyKey);
}
async function getOrders(userId, symbol, isOpen) {
    const query = `
    SELECT * FROM ${scyllaKeyspace}.orders_by_symbol
    WHERE symbol = ? AND "userId" = ?
    ORDER BY "createdAt" DESC;
  `;
    const params = [symbol, userId];
    try {
        const result = await client_1.default.execute(query, params, { prepare: true });
        return result.rows
            .map(mapRowToOrder)
            .filter((order) => isOpen ? order.status === "OPEN" : order.status !== "OPEN")
            .map((order) => ({
            ...order,
            amount: (0, blockchain_1.fromBigInt)(order.amount),
            price: (0, blockchain_1.fromBigInt)(order.price),
            cost: (0, blockchain_1.fromBigInt)(order.cost),
            fee: (0, blockchain_1.fromBigInt)(order.fee),
            filled: (0, blockchain_1.fromBigInt)(order.filled),
            remaining: (0, blockchain_1.fromBigInt)(order.remaining),
        }));
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch orders by userId and symbol: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch orders by userId and symbol: ${error.message}` });
    }
}
async function rollbackOrderCreation(orderId, userId, createdAt) {
    const query = `
    DELETE FROM ${scyllaKeyspace}.orders
    WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
  `;
    const params = [userId, createdAt, orderId];
    await client_1.default.execute(query, params, { prepare: true });
}
async function getRecentTrades(symbol, limit = 50) {
    var _a, _b, _c, _d;
    try {
        const query = `
      SELECT id, "userId", symbol, side, price, filled, trades, "updatedAt"
      FROM ${scyllaKeyspace}.orders_by_symbol
      WHERE symbol = ?
      LIMIT ?
      ALLOW FILTERING;
    `;
        const params = [symbol, limit * 2];
        const result = await client_1.default.execute(query, params, { prepare: true });
        const allTrades = [];
        for (const row of result.rows) {
            if (!row.trades || row.trades === '' || row.trades === '[]') {
                continue;
            }
            try {
                let trades;
                if (typeof row.trades === 'string') {
                    trades = JSON.parse(row.trades);
                    if (!Array.isArray(trades) && typeof trades === 'string') {
                        trades = JSON.parse(trades);
                    }
                }
                else if (Array.isArray(row.trades)) {
                    trades = row.trades;
                }
                else {
                    continue;
                }
                if (!Array.isArray(trades) || trades.length === 0) {
                    continue;
                }
                for (const trade of trades) {
                    allTrades.push({
                        id: trade.id || `${row.id}_${trade.timestamp}`,
                        price: typeof trade.price === 'bigint' ? (0, blockchain_1.fromBigInt)(trade.price) : trade.price,
                        amount: typeof trade.amount === 'bigint' ? (0, blockchain_1.fromBigInt)(trade.amount) : trade.amount,
                        side: row.side.toLowerCase(),
                        timestamp: trade.timestamp || row.updatedAt.getTime(),
                    });
                }
            }
            catch (parseError) {
                console_1.logger.error("SCYLLA", `Failed to parse trades for order ${row.id}`, parseError);
                continue;
            }
        }
        const sortedTrades = allTrades
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
        try {
            const tradesQuery = `
        SELECT id, price, amount, side, "createdAt", "isAiTrade"
        FROM ${scyllaKeyspace}.trades
        WHERE symbol = ?
        LIMIT ?
      `;
            const tradesResult = await client_1.default.execute(tradesQuery, [symbol, limit], { prepare: true });
            for (const row of tradesResult.rows) {
                sortedTrades.push({
                    id: ((_a = row.id) === null || _a === void 0 ? void 0 : _a.toString()) || `trade_${(_b = row.createdAt) === null || _b === void 0 ? void 0 : _b.getTime()}`,
                    price: row.price,
                    amount: row.amount,
                    side: ((_c = row.side) === null || _c === void 0 ? void 0 : _c.toLowerCase()) || 'buy',
                    timestamp: ((_d = row.createdAt) === null || _d === void 0 ? void 0 : _d.getTime()) || Date.now(),
                    isAiTrade: row.isAiTrade || false,
                });
            }
            sortedTrades.sort((a, b) => b.timestamp - a.timestamp);
        }
        catch (tradesTableError) {
            console_1.logger.debug("SCYLLA", `Trades table query failed (may not exist yet): ${tradesTableError.message}`);
        }
        return sortedTrades.slice(0, limit);
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch recent trades for ${symbol}: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch recent trades: ${error.message}` });
    }
}
async function insertTrade(symbol, price, amount, side, isAiTrade = false) {
    try {
        const query = `
      INSERT INTO ${scyllaKeyspace}.trades (symbol, "createdAt", id, price, amount, side, "isAiTrade")
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
        const tradeId = cassandra_driver_1.types.Uuid.random();
        const now = new Date();
        await client_1.default.execute(query, [symbol, now, tradeId, price, amount, side.toUpperCase(), isAiTrade], { prepare: true });
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to insert trade for ${symbol}: ${error.message}`, error);
    }
}
async function getOHLCV(symbol, interval, limit = 100) {
    try {
        const query = `
      SELECT open, high, low, close, volume, "createdAt"
      FROM ${scyllaKeyspace}.candles
      WHERE symbol = ? AND interval = ?
      ORDER BY "createdAt" DESC
      LIMIT ?;
    `;
        const params = [symbol, interval, limit];
        const result = await client_1.default.execute(query, params, { prepare: true });
        const ohlcv = result.rows
            .map((row) => [
            row.createdAt.getTime(),
            row.open,
            row.high,
            row.low,
            row.close,
            row.volume,
        ])
            .reverse();
        return ohlcv;
    }
    catch (error) {
        console_1.logger.error("SCYLLA", `Failed to fetch OHLCV for ${symbol} ${interval}: ${error.message}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch OHLCV: ${error.message}` });
    }
}
