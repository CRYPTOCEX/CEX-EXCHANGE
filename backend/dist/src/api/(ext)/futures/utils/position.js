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
const calculateUnrealizedPnl = (entryPrice, amount, currentPrice, side) => {
    if (side !== "BUY" && side !== "SELL") throw (0, error_1.createError)({ statusCode: 400, message: "Invalid position side" });
    const entry = BigInt(entryPrice), quantity = BigInt(amount), mark = BigInt(currentPrice);
    if (entry <= 0n || mark <= 0n || quantity < 0n) throw (0, error_1.createError)({ statusCode: 400, message: "Invalid position values" });
    const difference = side === "BUY" ? mark - entry : entry - mark;
    return difference * quantity / SCALE_FACTOR;
};
exports.calculateUnrealizedPnl = calculateUnrealizedPnl;
const updatePositions = async (buyOrder, sellOrder, amountToFill, matchedPrice) => {
    const orders = [buyOrder, sellOrder];
    const positions = await Promise.all(orders.map(order => (0, positions_1.getPosition)(order.userId, order.symbol, order.side)));
    // Check both legs before writing either. Storage failures after a write are
    // still fenced by the durable matching-cycle recovery marker.
    if (BigInt(amountToFill) <= 0n || BigInt(matchedPrice) <= 0n) throw (0, error_1.createError)({ statusCode: 400, message: "Invalid position fill" });
    positions.forEach((position, index) => {
        if (position && Number(position.leverage) !== Number(orders[index].leverage)) throw (0, error_1.createError)({ statusCode: 409, message: "Position leverage differs from order leverage; reconciliation required" });
        if (position && (BigInt(position.amount) < 0n || BigInt(position.entryPrice) <= 0n)) throw (0, error_1.createError)({ statusCode: 409, message: "Invalid existing position; reconciliation required" });
    });
    for (let index = 0; index < orders.length; index++) {
        if (positions[index]) await updateExistingPosition(positions[index], orders[index], amountToFill, matchedPrice);
        else await createNewPosition(orders[index], amountToFill, matchedPrice);
    }
};
exports.updatePositions = updatePositions;
const updateExistingPosition = async (position, order, amount, matchedPrice) => {
    // A single position row cannot represent different collateral leverages.
    if (Number(position.leverage) !== Number(order.leverage)) throw (0, error_1.createError)({ statusCode: 409, message: "Position leverage differs from order leverage; reconciliation required" });
    const oldAmount = BigInt(position.amount), fillAmount = BigInt(amount);
    const scaledNewAmount = oldAmount + fillAmount;
    if (oldAmount < 0n || fillAmount <= 0n || BigInt(matchedPrice) <= 0n) throw (0, error_1.createError)({ statusCode: 400, message: "Invalid position fill" });
    const scaledNewEntryPrice = (BigInt(position.entryPrice) * oldAmount + BigInt(matchedPrice) * fillAmount) / scaledNewAmount;
    const unrealizedPnl = (0, exports.calculateUnrealizedPnl)(scaledNewEntryPrice, scaledNewAmount, matchedPrice, order.side);
    await (0, positions_1.updatePositionInDB)(position.userId, position.id, scaledNewEntryPrice, scaledNewAmount, unrealizedPnl, position.stopLossPrice, position.takeProfitPrice);
};
const createNewPosition = async (order, amount, matchedPrice) => {
    const unrealizedPnl = (0, exports.calculateUnrealizedPnl)(matchedPrice, amount, matchedPrice, order.side);
    await (0, positions_1.createPosition)(order.userId, order.symbol, order.side, matchedPrice, amount, order.leverage, unrealizedPnl, order.stopLossPrice, order.takeProfitPrice);
};
const closePosition = async () => {
    // Neither the legacy position row nor its cached PnL proves a refundable hold.
    // Settlement needs durable fill/collateral attribution and a funded PnL counterparty.
    throw (0, error_1.createError)({ statusCode: 503, message: "Futures position settlement unavailable: collateral reconciliation required" });
};
exports.closePosition = closePosition;
