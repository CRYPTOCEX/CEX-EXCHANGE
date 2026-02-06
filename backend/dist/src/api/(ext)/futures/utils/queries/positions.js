"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPosition = getPosition;
exports.getPositions = getPositions;
exports.getAllOpenPositions = getAllOpenPositions;
exports.createPosition = createPosition;
exports.updatePositionInDB = updatePositionInDB;
exports.updatePositionStatus = updatePositionStatus;
const error_1 = require("@b/utils/error");
let client;
let scyllaFuturesKeyspace;
try {
    const module = require("@b/api/(ext)/ecosystem/utils/scylla/client");
    client = module.default;
    scyllaFuturesKeyspace = module.scyllaFuturesKeyspace;
}
catch (e) {
}
const passwords_1 = require("@b/utils/passwords");
const order_1 = require("./order");
const console_1 = require("@b/utils/console");
async function getPosition(userId, symbol, side) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.positions_by_symbol
    WHERE symbol = ? AND "userId" = ? AND side = ? AND status = 'OPEN' ALLOW FILTERING;
  `;
    const params = [symbol, userId, side];
    try {
        const result = await client.execute(query, params, { prepare: true });
        if (result.rows.length > 0) {
            const row = result.rows[0];
            return {
                id: (0, order_1.uuidToString)(row.id),
                userId: (0, order_1.uuidToString)(row.userId),
                symbol: row.symbol,
                side: row.side,
                entryPrice: BigInt(row.entryPrice),
                amount: BigInt(row.amount),
                leverage: Number(row.leverage),
                unrealizedPnl: BigInt(row.unrealizedPnl),
                stopLossPrice: row.stopLossPrice
                    ? BigInt(row.stopLossPrice)
                    : undefined,
                takeProfitPrice: row.takeProfitPrice
                    ? BigInt(row.takeProfitPrice)
                    : undefined,
                status: row.status,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
            };
        }
        return null;
    }
    catch (error) {
        console_1.logger.error("POSITIONS", "Failed to fetch position", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch position: ${error.message}`,
        });
    }
}
async function getPositions(userId, symbol, status) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    let query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.position
    WHERE "userId" = ?
  `;
    const params = [userId];
    if (symbol) {
        query += ` AND symbol = ?`;
        params.push(symbol);
    }
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    query += ` ALLOW FILTERING;`;
    try {
        const result = await client.execute(query, params, { prepare: true });
        return result.rows.map((row) => ({
            id: (0, order_1.uuidToString)(row.id),
            userId: (0, order_1.uuidToString)(row.userId),
            symbol: row.symbol,
            side: row.side,
            entryPrice: BigInt(row.entryPrice),
            amount: BigInt(row.amount),
            leverage: Number(row.leverage),
            unrealizedPnl: BigInt(row.unrealizedPnl),
            stopLossPrice: row.stopLossPrice ? BigInt(row.stopLossPrice) : undefined,
            takeProfitPrice: row.takeProfitPrice
                ? BigInt(row.takeProfitPrice)
                : undefined,
            status: row.status,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        }));
    }
    catch (error) {
        console_1.logger.error("POSITIONS", "Failed to fetch positions", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch positions: ${error.message}`,
        });
    }
}
async function getAllOpenPositions() {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    SELECT * FROM ${scyllaFuturesKeyspace}.position WHERE status = 'OPEN' ALLOW FILTERING;
  `;
    try {
        const result = await client.execute(query, [], { prepare: true });
        return result.rows.map((row) => ({
            id: (0, order_1.uuidToString)(row.id),
            userId: (0, order_1.uuidToString)(row.userId),
            symbol: row.symbol,
            side: row.side,
            entryPrice: BigInt(row.entryPrice),
            amount: BigInt(row.amount),
            leverage: Number(row.leverage),
            unrealizedPnl: BigInt(row.unrealizedPnl),
            stopLossPrice: row.stopLossPrice ? BigInt(row.stopLossPrice) : undefined,
            takeProfitPrice: row.takeProfitPrice
                ? BigInt(row.takeProfitPrice)
                : undefined,
            status: row.status,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
        }));
    }
    catch (error) {
        console_1.logger.error("POSITIONS", "Failed to fetch open positions", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch open positions: ${error.message}`,
        });
    }
}
async function createPosition(userId, symbol, side, entryPrice, amount, leverage, unrealizedPnl, stopLossPrice, takeProfitPrice) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    INSERT INTO ${scyllaFuturesKeyspace}.position (id, "userId", symbol, side, "entryPrice", amount, leverage, "unrealizedPnl", "stopLossPrice", "takeProfitPrice", status, "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?);
  `;
    const params = [
        (0, passwords_1.makeUuid)(),
        userId,
        symbol,
        side,
        entryPrice.toString(),
        amount.toString(),
        leverage,
        unrealizedPnl.toString(),
        (stopLossPrice === null || stopLossPrice === void 0 ? void 0 : stopLossPrice.toString()) || null,
        (takeProfitPrice === null || takeProfitPrice === void 0 ? void 0 : takeProfitPrice.toString()) || null,
        new Date(),
        new Date(),
    ];
    try {
        await client.execute(query, params, { prepare: true });
    }
    catch (error) {
        console_1.logger.error("POSITIONS", "Failed to create position", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to create position: ${error.message}`,
        });
    }
}
async function updatePositionInDB(userId, id, entryPrice, amount, unrealizedPnl, stopLossPrice, takeProfitPrice) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    UPDATE ${scyllaFuturesKeyspace}.position
    SET "entryPrice" = ?, amount = ?, "unrealizedPnl" = ?, "stopLossPrice" = ?, "takeProfitPrice" = ?, "updatedAt" = ?
    WHERE "userId" = ? AND id = ?;
  `;
    const params = [
        entryPrice.toString(),
        amount.toString(),
        unrealizedPnl.toString(),
        (stopLossPrice === null || stopLossPrice === void 0 ? void 0 : stopLossPrice.toString()) || null,
        (takeProfitPrice === null || takeProfitPrice === void 0 ? void 0 : takeProfitPrice.toString()) || null,
        new Date(),
        userId,
        id,
    ];
    try {
        await client.execute(query, params, { prepare: true });
    }
    catch (error) {
        console_1.logger.error("POSITIONS", "Failed to update position", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to update position: ${error.message}`,
        });
    }
}
async function updatePositionStatus(userId, id, status) {
    if (!client || !scyllaFuturesKeyspace) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
    }
    const query = `
    UPDATE ${scyllaFuturesKeyspace}.position
    SET status = ?, "updatedAt" = ?
    WHERE "userId" = ? AND id = ?;
  `;
    const params = [status, new Date(), userId, id];
    try {
        await client.execute(query, params, { prepare: true });
    }
    catch (error) {
        console_1.logger.error("POSITIONS", "Failed to update position status", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to update position status: ${error.message}`,
        });
    }
}
