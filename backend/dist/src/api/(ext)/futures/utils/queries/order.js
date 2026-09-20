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
const { models } = require("@b/db");
const { walletService } = require("@b/services/wallet");
const { createHash } = require("crypto");
const { withFuturesEngineLock } = require("../engine-lock");
const { cancelFundedOrder } = require("../cancel-funded-order");
async function syncOrderLevel(order) {
    const rows = await readAllPages(`SELECT * FROM ${scyllaFuturesKeyspace}.orders WHERE symbol = ? AND side = ? AND price = ? AND status = 'OPEN' ALLOW FILTERING`, [order.symbol, order.side, String(order.price)]);
    let remaining = 0n;
    for (const row of rows) if (await fundingRecord(String(row.id), String(row.userId))) remaining += BigInt(String(row.remaining));
    const side = order.side === "BUY" ? "BIDS" : "ASKS";
    const price = String(fromBigInt(order.price));
    if (remaining > 0n) await client.execute(`INSERT INTO ${scyllaFuturesKeyspace}.orderbook (symbol, price, side, amount) VALUES (?, ?, ?, ?)`, [order.symbol, price, side, String(fromBigInt(remaining))], { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
    else await client.execute(`DELETE FROM ${scyllaFuturesKeyspace}.orderbook WHERE symbol = ? AND price = ? AND side = ?`, [order.symbol, price, side], { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
}
async function refreshLevelSafely(order) {
    try { await syncOrderLevel(order); } catch (error) { console_1.logger.warn("FUTURES", "Order ledger committed; book projection refresh pending", error); }
}
function fundingRecord(id, userId) { return models.transaction.findOne({ where: { idempotencyKey: `futures_hold_${id}`, userId, status: "COMPLETED" } }); }
exports.readAllPages = readAllPages;
async function readAllPages(q, params = []) {
    const rows = [], seen = new Set(); let pageState, pages = 0;
    do {
        const result = await client.execute(q, params, { prepare: true, consistency: 6, fetchSize: 5000, ...(pageState ? { pageState } : {}) });
        if (!Array.isArray(result.rows)) throw (0, error_1.createError)({ statusCode: 503, message: "Invalid futures storage response" });
        rows.push(...result.rows); pages++;
        pageState = result.pageState;
        if (rows.length > 50000 || (pageState && (rows.length >= 50000 || pages >= 200))) throw (0, error_1.createError)({ statusCode: 503, message: "Futures scan exceeds safe bounds; reconciliation required" });
        if (pageState) {
            const token = typeof pageState === "string" ? pageState : Buffer.from(pageState).toString("hex");
            if (seen.has(token)) throw (0, error_1.createError)({ statusCode: 503, message: "Futures pagination repeated; incomplete scan refused" });
            seen.add(token);
        }
    } while (pageState);
    return rows;
}
function uuidToString(uuid) {
    if (typeof uuid === "string") return uuid;
    return (0, uuid_1.stringify)(uuid.buffer);
}
async function query(q, params = []) {
    if (!client) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    return client.execute(q, params, { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
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
        const result = await client.execute(query, params, { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
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
    if (!row) return null;
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
        .execute(query, params, { prepare: true, consistency: 6 /* LOCAL_QUORUM */ })
        .then((result) => result.rows[0])
        .then(mapRowToOrder);
}
async function cancelOrderByUuid(userId, id, createdAt) {
    if (!client || !scyllaFuturesKeyspace) throw createLifecycleError(503, "Futures storage unavailable");
    return cancelFundedOrder({
        lock: withFuturesEngineLock, read: getOrderByUuid, hold: fundingRecord, error: createLifecycleError,
        release: (operation) => walletService.release(operation),
        refresh: refreshLevelSafely,
        beforeRelease: async () => {
            if (await models.settings.findOne({ where: { key: "futuresEnginePendingCycle" } })) throw createLifecycleError(503, "Futures settlement is in progress or requires recovery; refund retained for retry");
        },
        evict: (orderId, symbol) => matchingEngine_1.FuturesMatchingEngine.recordCancellation(orderId, symbol),
        markCancelled: async (order) => {
            // Retain cost, fee, amount and remainder as the durable retry proof.
            await client.execute(`UPDATE ${scyllaFuturesKeyspace}.orders SET status = 'CANCELED', "updatedAt" = ? WHERE "userId" = ? AND id = ? AND "createdAt" = ?`, [new Date(), userId, id, createdAt], { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
        },
    }, userId, id, createdAt);
}
function createLifecycleError(statusCode, message) { return (0, error_1.createError)({ statusCode, message }); }
function applyLeverage(amount, leverage) {
    return amount * BigInt(Math.max(1, Math.floor(leverage)));
}
async function createOrder(input) {
    return withFuturesEngineLock(() => publishFundedOrder(input));
}
async function publishFundedOrder({ userId, symbol, amount, price, cost, type, side, fee, feeCurrency, leverage, stopLossPrice, takeProfitPrice, clientKey }) {
    if (!client || !scyllaFuturesKeyspace || !removeTolerance) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    if (typeof clientKey !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(clientKey)) throw createLifecycleError(400, "A valid idempotency-key header is required");
    const hash = createHash("sha256").update(JSON.stringify([String(userId), clientKey])).digest("hex");
    const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
    const fingerprint = createHash("sha256").update(JSON.stringify([symbol,String(amount),String(price),String(cost),type,side,String(fee),feeCurrency,leverage,String(stopLossPrice ?? ""),String(takeProfitPrice ?? "")])).digest("hex");
    const priorHold = await fundingRecord(id, userId);
    const priorMeta = priorHold ? (typeof priorHold.metadata === "string" ? JSON.parse(priorHold.metadata) : priorHold.metadata) : null;
    if (priorHold && priorMeta?.fingerprint !== fingerprint) throw createLifecycleError(409, "Idempotency key already used for a different futures order");
    const currentTimestamp = priorMeta ? new Date(priorMeta.futuresOrder.createdAt) : new Date();
    if (priorHold) {
        const existing = await getOrderByUuid(userId, id, currentTimestamp);
        if (existing) { await refreshLevelSafely(existing); return existing; }
    }
    const leveragedAmount = amount; // amount is contract quantity; leverage changes collateral, not quantity
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
    if (!priorHold) {
        await walletService.hold({
            idempotencyKey: `futures_hold_${id}`, userId, walletType: "FUTURES", currency: feeCurrency,
            amount: fromBigInt(costTolerance + feeTolerance), reason: "Futures order collateral", operationType: "FUTURES_ORDER",
            metadata: { fingerprint, futuresOrder: { id, symbol, amount: String(amountTolerance), cost: String(costTolerance), fee: String(feeTolerance), createdAt: currentTimestamp.toISOString() } },
        });
    }
    try {
        await client.execute(query, params, {
            prepare: true, consistency: 6 /* LOCAL_QUORUM */,
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
        await refreshLevelSafely(newOrder);
        // OPEN publication follows the committed hold. Queue refresh is done
        // after leaving the lifecycle lock by the route / next engine cycle.
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
    SELECT * FROM ${scyllaFuturesKeyspace}.orders
    WHERE status = 'OPEN' ALLOW FILTERING;
  `;
    try {
        return await readAllPages(query, []);
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
    `, [symbol], { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
    for (const row of ordersResult.rows) {
        await cancelAndRefundOrder(row.userId, row.id, row.createdAt);
    }
    // Cancelled rows are retained as settlement and idempotency evidence.
    const deleteOrdersQueries = [];
    const candlesResult = await client.execute(`
      SELECT interval, "createdAt"
      FROM ${scyllaFuturesKeyspace}.candles
      WHERE symbol = ?;
    `, [symbol], { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
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
      `, [symbol, side], { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
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
        await client.batch(batchQueries, { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
    }
    catch (err) {
        console_1.logger.error("FUTURES", `Failed to delete all futures market data: ${err.message}`);
    }
}
async function cancelAndRefundOrder(userId, id, createdAt) {
    return cancelOrderByUuid(userId, id, createdAt);
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
        const result = await client.execute(query, params, { prepare: true, consistency: 6 /* LOCAL_QUORUM */ });
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
    if (!client || !scyllaFuturesKeyspace) throw createLifecycleError(503, "Futures storage unavailable");
    const rows = await readAllPages(`SELECT * FROM ${scyllaFuturesKeyspace}.orders WHERE "userId" = ?`, [userId]);
    let cancelledCount = 0;
    const failures = [];
    for (const order of rows.filter((r) => ["OPEN", "CANCELED"].includes(r.status))) {
        try { await cancelOrderByUuid(userId, order.id, order.createdAt); cancelledCount++; }
        catch (error) { failures.push({ id: String(order.id), statusCode: error.statusCode || 500, message: error.message }); }
    }
    return { cancelledCount, failures, complete: failures.length === 0 };
}
