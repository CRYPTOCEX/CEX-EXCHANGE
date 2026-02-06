"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePosition = exports.updatePositions = exports.calculateUnrealizedPnl = void 0;
const utils_1 = require("@b/api/finance/wallet/utils");
const error_1 = require("@b/utils/error");
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
    if (position) {
        const realizedPnl = fromBigIntMultiply ? fromBigIntMultiply(position.unrealizedPnl, BigInt(1)) : position.unrealizedPnl;
        const baseCurrency = order.symbol.split("/")[1];
        const wallet = await (0, utils_1.getWallet)(order.userId, FUTURES_WALLET_TYPE, baseCurrency);
        if (wallet) {
            if (updateWalletBalance) {
                await updateWalletBalance(wallet, realizedPnl, "add");
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: "Ecosystem extension not available for wallet operations" });
            }
        }
        else {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `Wallet not found for user ${order.userId} and currency ${baseCurrency}`
            });
        }
        await (0, positions_1.updatePositionStatus)(position.userId, position.id, "CLOSED");
    }
    else {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `No position found for user ${order.userId} and symbol ${order.symbol}`
        });
    }
};
exports.closePosition = closePosition;
