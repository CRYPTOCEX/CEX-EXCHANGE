"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uuidToString = uuidToString;
exports.query = query;
exports.getOrdersByUserId = getOrdersByUserId;
exports.getOrderByUuid = getOrderByUuid;
exports.cancelOrderByUuid = cancelOrderByUuid;
exports.createOrder = createOrder;
exports.getAllOpenOrders = getAllOpenOrders;
exports.generateOrderUpdateQueries = generateOrderUpdateQueries;
exports.deleteAllMarketData = deleteAllMarketData;
exports.getOrders = getOrders;
exports.cancelAllOrdersByUserId = cancelAllOrdersByUserId;
const error_1 = require("@b/utils/error");
let fromBigInt;
let fromBigIntMultiply;
let removeTolerance;
let client;
let scyllaFuturesKeyspace;
let getWalletByUserIdAndCurrency;
let updateWalletBalance;
try {
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
    fromBigIntMultiply = blockchainModule.fromBigIntMultiply;
    removeTolerance = blockchainModule.removeTolerance;
    const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
    client = clientModule.default;
    scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;
    const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
    getWalletByUserIdAndCurrency = walletModule.getWalletByUserIdAndCurrency;
    updateWalletBalance = walletModule.updateWalletBalance;
}
catch (e) {
}
const passwords_1 = require("@b/utils/passwords");
const console_1 = require("@b/utils/console");
const matchingEngine_1 = require("../matchingEngine");
const orderbook_1 = require("./orderbook");
const uuid_1 = require("uuid");
function uuidToString(uuid) {
    return (0, uuid_1.stringify)(uuid.buffer);
}
async function query(q, params = []) {
    if (!client) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    return client.execute(q, params, { prepare: true });
}
async function getOrdersByUserId(userId) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orders
    WHERE "userId" = ?
    ORDER BY "createdAt" DESC;
  `;
    const params = [userId];
    try {
        const result = await client.execute(query, params, { prepare: true });
        return result.rows.map(mapRowToOrder);
    }
    catch (error) {
        console_1.logger.error("FUTURES", `Failed to fetch futures orders by userId: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch futures orders by userId: ${error.message}`,
        });
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
        leverage: row.leverage,
        stopLossPrice: row.stopLossPrice,
        takeProfitPrice: row.takeProfitPrice,
    };
}
function getOrderByUuid(userId, id, createdAt) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orders
    WHERE "userId" = ? AND id = ? AND "createdAt" = ?;
  `;
    const params = [userId, id, createdAt];
    return client
        .execute(query, params, { prepare: true })
        .then((result) => result.rows[0])
        .then(mapRowToOrder);
}
async function cancelOrderByUuid(userId, id, createdAt, symbol, price, side, amount) {
    if (!client || !scyllaFuturesKeyspace || !fromBigInt) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const priceFormatted = fromBigInt(price);
    const orderbookSide = side === "BUY" ? "BIDS" : "ASKS";
    const orderbookAmount = await (0, orderbook_1.getOrderbookEntry)(symbol, priceFormatted, orderbookSide);
    let orderbookQuery = "";
    let orderbookParams = [];
    if (orderbookAmount) {
        const newAmount = orderbookAmount - amount;
        if (newAmount <= BigInt(0)) {
            orderbookQuery = `DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`;
            orderbookParams = [symbol, priceFormatted.toString(), orderbookSide];
        }
        else {
            orderbookQuery = `UPDATE ${scyllaFuturesKeyspace}.orderbook SET amount = ? WHERE symbol = ? AND price = ? AND side = ?`;
            orderbookParams = [
                fromBigInt(newAmount).toString(),
                symbol,
                priceFormatted.toString(),
                orderbookSide,
            ];
        }
    }
    else {
        console_1.logger.warn("FUTURES", `No orderbook entry found for symbol: ${symbol}, price: ${priceFormatted}, side: ${orderbookSide}`);
    }
    const deleteOrderQuery = `DELETE FROM ${scyllaFuturesKeyspace}.orders WHERE "userId" = ? AND id = ? AND "createdAt" = ?`;
    const deleteOrderParams = [userId, id, createdAt];
    const batchQueries = orderbookQuery
        ? [
            { query: orderbookQuery, params: orderbookParams },
            { query: deleteOrderQuery, params: deleteOrderParams },
        ]
        : [{ query: deleteOrderQuery, params: deleteOrderParams }];
    try {
        await client.batch(batchQueries, { prepare: true });
    }
    catch (error) {
        console_1.logger.error("FUTURES", `Failed to cancel futures order and update orderbook: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to cancel futures order and update orderbook: ${error.message}`,
        });
    }
}
function applyLeverage(amount, leverage) {
    return amount * BigInt(Math.max(1, Math.floor(leverage)));
}
async function createOrder({ userId, symbol, amount, price, cost, type, side, fee, feeCurrency, leverage, stopLossPrice, takeProfitPrice, }) {
    if (!client || !scyllaFuturesKeyspace || !removeTolerance) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const currentTimestamp = new Date();
    const leveragedAmount = applyLeverage(amount, leverage);
    const query = `
    INSERT INTO ${scyllaFuturesKeyspace}.orders (
      id, "userId", symbol, type, "timeInForce", side, price, average,
      amount, filled, remaining, cost, leverage, fee, "feeCurrency", status,
      "stopLossPrice", "takeProfitPrice", "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
    const priceTolerance = removeTolerance(price);
    const amountTolerance = removeTolerance(leveragedAmount);
    const costTolerance = removeTolerance(cost);
    const feeTolerance = removeTolerance(fee);
    const stopLossTolerance = stopLossPrice
        ? removeTolerance(stopLossPrice)
        : undefined;
    const takeProfitTolerance = takeProfitPrice
        ? removeTolerance(takeProfitPrice)
        : undefined;
    const id = (0, passwords_1.makeUuid)();
    const params = [
        id,
        userId,
        symbol,
        type,
        "GTC",
        side,
        priceTolerance.toString(),
        "0",
        amountTolerance.toString(),
        "0",
        amountTolerance.toString(),
        costTolerance.toString(),
        leverage.toString(),
        feeTolerance.toString(),
        feeCurrency,
        "OPEN",
        stopLossTolerance ? stopLossTolerance.toString() : null,
        takeProfitTolerance ? takeProfitTolerance.toString() : null,
        currentTimestamp,
        currentTimestamp,
    ];
    try {
        await client.execute(query, params, {
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
            leverage,
            stopLossPrice: stopLossTolerance,
            takeProfitPrice: takeProfitTolerance,
        };
        const matchingEngine = await matchingEngine_1.FuturesMatchingEngine.getInstance();
        matchingEngine.addToQueue(newOrder);
        return newOrder;
    }
    catch (error) {
        console_1.logger.error("FUTURES", `Failed to create futures order: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to create futures order: ${error.message}`,
        });
    }
}
async function getAllOpenOrders() {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.open_order
    WHERE status = 'OPEN' ALLOW FILTERING;
  `;
    try {
        const result = await client.execute(query, [], { prepare: true });
        return result.rows;
    }
    catch (error) {
        console_1.logger.error("FUTURES", `Failed to fetch all open futures orders: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch all open futures orders: ${error.message}`,
        });
    }
}
function generateOrderUpdateQueries(ordersToUpdate) {
    if (!scyllaFuturesKeyspace || !removeTolerance) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const queries = ordersToUpdate.map((order) => {
        return {
            query: `
        UPDATE ${scyllaFuturesKeyspace}.orders
        SET filled = ?, remaining = ?, status = ?, "updatedAt" = ?, trades = ?
        WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
      `,
            params: [
                removeTolerance(order.filled).toString(),
                removeTolerance(order.remaining).toString(),
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
async function deleteAllMarketData(symbol) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const ordersResult = await client.execute(`
      SELECT "userId", "createdAt", id
      FROM ${scyllaFuturesKeyspace}.orders_by_symbol
      WHERE symbol = ?
      ALLOW FILTERING;
    `, [symbol], { prepare: true });
    for (const row of ordersResult.rows) {
        await cancelAndRefundOrder(row.userId, row.id, row.createdAt);
    }
    const deleteOrdersQueries = ordersResult.rows.map((row) => ({
        query: `
      DELETE FROM ${scyllaFuturesKeyspace}.orders
      WHERE "userId" = ? AND "createdAt" = ? AND id = ?;
    `,
        params: [row.userId, row.createdAt, row.id],
    }));
    const candlesResult = await client.execute(`
      SELECT interval, "createdAt"
      FROM ${scyllaFuturesKeyspace}.candles
      WHERE symbol = ?;
    `, [symbol], { prepare: true });
    const deleteCandlesQueries = candlesResult.rows.map((row) => ({
        query: `
      DELETE FROM ${scyllaFuturesKeyspace}.candles
      WHERE symbol = ? AND interval = ? AND "createdAt" = ?;
    `,
        params: [symbol, row.interval, row.createdAt],
    }));
    const sides = ["ASKS", "BIDS"];
    const deleteOrderbookQueries = [];
    for (const side of sides) {
        const orderbookResult = await client.execute(`
        SELECT price
        FROM ${scyllaFuturesKeyspace}.orderbook
        WHERE symbol = ? AND side = ?;
      `, [symbol, side], { prepare: true });
        const queries = orderbookResult.rows.map((row) => ({
            query: `
        DELETE FROM ${scyllaFuturesKeyspace}.orderbook
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
        await client.batch(batchQueries, { prepare: true });
    }
    catch (err) {
        console_1.logger.error("FUTURES", `Failed to delete all futures market data: ${err.message}`);
    }
}
async function cancelAndRefundOrder(userId, id, createdAt) {
    const order = await getOrderByUuid(userId, id, createdAt);
    if (!order) {
        console_1.logger.warn("FUTURES", `Order not found for UUID: ${id}`);
        return;
    }
    if (order.status !== "OPEN" || BigInt(order.remaining) === BigInt(0)) {
        return;
    }
    if (!fromBigIntMultiply || !fromBigInt || !getWalletByUserIdAndCurrency || !updateWalletBalance) {
        console_1.logger.warn("FUTURES", "Ecosystem extension not available for wallet operations");
        return;
    }
    const refundAmount = order.side === "BUY"
        ? fromBigIntMultiply(BigInt(order.remaining) + BigInt(order.fee), BigInt(order.price))
        : fromBigInt(BigInt(order.remaining) + BigInt(order.fee));
    const walletCurrency = order.side === "BUY"
        ? order.symbol.split("/")[1]
        : order.symbol.split("/")[0];
    const wallet = await getWalletByUserIdAndCurrency(userId, walletCurrency);
    if (!wallet) {
        console_1.logger.warn("FUTURES", `${walletCurrency} wallet not found for user ID: ${userId}`);
        return;
    }
    await updateWalletBalance(wallet, refundAmount, "add");
}
async function getOrders(userId, symbol, isOpen) {
    if (!client || !scyllaFuturesKeyspace || !fromBigInt) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    let query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.orders
    WHERE "userId" = ?
  `;
    const params = [userId];
    if (symbol) {
        query += ` AND symbol = ?`;
        params.push(symbol);
    }
    if (isOpen) {
        query += ` AND status = 'OPEN'`;
    }
    query += ` ORDER BY "createdAt" DESC ALLOW FILTERING`;
    try {
        const result = await client.execute(query, params, { prepare: true });
        return result.rows.map(mapRowToOrder).map((order) => ({
            ...order,
            amount: fromBigInt(order.amount),
            price: fromBigInt(order.price),
            cost: fromBigInt(order.cost),
            fee: fromBigInt(order.fee),
            filled: fromBigInt(order.filled),
            remaining: fromBigInt(order.remaining),
            average: order.average ? fromBigInt(order.average) : 0,
            stopLossPrice: order.stopLossPrice
                ? fromBigInt(order.stopLossPrice)
                : undefined,
            takeProfitPrice: order.takeProfitPrice
                ? fromBigInt(order.takeProfitPrice)
                : undefined,
        }));
    }
    catch (error) {
        console_1.logger.error("FUTURES", `Failed to fetch futures orders: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch futures orders: ${error.message}`,
        });
    }
}
async function cancelAllOrdersByUserId(userId) {
    try {
        const openOrders = await getOrders(userId, undefined, true);
        if (openOrders.length === 0) {
            return { cancelledCount: 0 };
        }
        let cancelledCount = 0;
        for (const order of openOrders) {
            try {
                await cancelOrderByUuid(order.userId, order.id, order.createdAt.toISOString(), order.symbol, BigInt(Math.floor(order.price * 1e8)), order.side, BigInt(Math.floor(order.remaining * 1e8)));
                cancelledCount++;
            }
            catch (error) {
                console_1.logger.error("FUTURES", `Failed to cancel order ${order.id}: ${error}`);
            }
        }
        return { cancelledCount };
    }
    catch (error) {
        console_1.logger.error("FUTURES", `Failed to cancel all orders for user ${userId}: ${error}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to cancel all orders: ${error.message}`,
        });
    }
}
