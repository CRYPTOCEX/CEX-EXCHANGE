"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePosition = exports.updatePositions = exports.calculateUnrealizedPnl = void 0;
const utils_1 = require("@b/api/finance/wallet/utils");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
let fromBigIntMultiply;
let fromBigInt;
try {
    const module = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigIntMultiply = module.fromBigIntMultiply;
    fromBigInt = module.fromBigInt;
}
catch (e) {
}
const positions_1 = require("./queries/positions");
let updateWalletBalance;
try {
    const module = require("../../ecosystem/utils/wallet");
    updateWalletBalance = module.updateWalletBalance;
}
catch (e) {
}
const SCALE_FACTOR = BigInt(10 ** 18);
const FUTURES_WALLET_TYPE = "FUTURES";
const isScyllaValidationError = (err) => {
    var _a;
    if (!err)
        return false;
    const code = typeof err.code === "number" ? err.code : undefined;
    if (code !== undefined) {
        if (code >= 0x2000 && code <= 0x2500)
            return true;
    }
    const name = err.name || ((_a = err.constructor) === null || _a === void 0 ? void 0 : _a.name) || "";
    if (/SyntaxError|InvalidQueryException|ResponseError/i.test(name) && code === undefined) {
        return true;
    }
    return false;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const executeScyllaWithRetry = async (run, maxAttempts = 3) => {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await run();
            return;
        }
        catch (err) {
            lastErr = err;
            if (isScyllaValidationError(err))
                throw err;
            if (attempt < maxAttempts) {
                await sleep(100 * Math.pow(2, attempt - 1));
            }
        }
    }
    throw lastErr;
};
const scaleDown = (value) => Number(value) / Number(SCALE_FACTOR);
const scaleUp = (value) => BigInt(Math.round(value * Number(SCALE_FACTOR)));
const calculateUnrealizedPnl = (entryPrice, amount, currentPrice, side) => {
    const unscaledEntryPrice = scaleDown(entryPrice);
    const unscaledCurrentPrice = scaleDown(currentPrice);
    const unscaledAmount = scaleDown(amount);
    const pnl = side === "BUY"
        ? (unscaledCurrentPrice - unscaledEntryPrice) * unscaledAmount
        : (unscaledEntryPrice - unscaledCurrentPrice) * unscaledAmount;
    return scaleUp(pnl);
};
exports.calculateUnrealizedPnl = calculateUnrealizedPnl;
const updatePositions = async (buyOrder, sellOrder, amountToFill, matchedPrice) => {
    await Promise.all([
        updateSinglePosition(buyOrder, amountToFill, matchedPrice),
        updateSinglePosition(sellOrder, amountToFill, matchedPrice),
    ]);
};
exports.updatePositions = updatePositions;
const updateSinglePosition = async (order, amount, matchedPrice) => {
    const position = await (0, positions_1.getPosition)(order.userId, order.symbol, order.side);
    if (position) {
        await updateExistingPosition(position, order, amount, matchedPrice);
    }
    else {
        await createNewPosition(order, amount, matchedPrice);
    }
};
const updateExistingPosition = async (position, order, amount, matchedPrice) => {
    const newAmount = scaleDown(position.amount) + scaleDown(amount);
    const newEntryPrice = (scaleDown(position.entryPrice) * scaleDown(position.amount) +
        scaleDown(order.price) * scaleDown(amount)) /
        newAmount;
    const scaledNewAmount = scaleUp(newAmount);
    const scaledNewEntryPrice = scaleUp(newEntryPrice);
    const unrealizedPnl = (0, exports.calculateUnrealizedPnl)(scaledNewEntryPrice, scaledNewAmount, matchedPrice, order.side);
    await (0, positions_1.updatePositionInDB)(position.userId, position.id, scaledNewEntryPrice, scaledNewAmount, unrealizedPnl, position.stopLossPrice, position.takeProfitPrice);
};
const createNewPosition = async (order, amount, matchedPrice) => {
    const unrealizedPnl = (0, exports.calculateUnrealizedPnl)(order.price, amount, matchedPrice, order.side);
    await (0, positions_1.createPosition)(order.userId, order.symbol, order.side, order.price, amount, order.leverage, unrealizedPnl, order.stopLossPrice, order.takeProfitPrice);
};
const closePosition = async (order) => {
    const position = await (0, positions_1.getPosition)(order.userId, order.symbol, order.side);
    if (!position) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `No position found for user ${order.userId} and symbol ${order.symbol}`
        });
    }
    const realizedPnl = fromBigIntMultiply ? fromBigIntMultiply(position.unrealizedPnl, BigInt(1)) : position.unrealizedPnl;
    const baseCurrency = order.symbol.split("/")[1];
    const wallet = await (0, utils_1.getWallet)(order.userId, FUTURES_WALLET_TYPE, baseCurrency);
    if (!wallet) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `Wallet not found for user ${order.userId} and currency ${baseCurrency}`
        });
    }
    if (!updateWalletBalance) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Ecosystem extension not available for wallet operations" });
    }
    const idempotencyKey = `futures_close_${position.id}`;
    await db_1.sequelize.transaction(async (t) => {
        await updateWalletBalance(wallet, realizedPnl, "add", idempotencyKey, t);
    });
    try {
        await executeScyllaWithRetry(async () => {
            await (0, positions_1.updatePositionStatus)(position.userId, position.id, "CLOSED");
        });
    }
    catch (scyllaErr) {
        console_1.logger.error("FUTURES_CLOSE", `Scylla position status update FAILED after wallet credit succeeded. Money is safe; position still shows open. reconcileFuturesPositions will replay. idempotencyKey=${idempotencyKey} positionId=${position.id} userId=${position.userId} amount=${realizedPnl}`, scyllaErr);
    }
};
exports.closePosition = closePosition;
