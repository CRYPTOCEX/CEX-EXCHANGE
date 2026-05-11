"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWarningEmail = exports.liquidatePosition = exports.checkForLiquidation = void 0;
exports.sendLiquidationWarningEmail = sendLiquidationWarningEmail;
exports.sendPartialLiquidationNotificationEmail = sendPartialLiquidationNotificationEmail;
exports.sendLiquidationNotificationEmail = sendLiquidationNotificationEmail;
let fromBigInt;
let toBigIntFloat;
let client;
let scyllaFuturesKeyspace;
let getWalletByUserIdAndCurrency;
let updateWalletBalance;
try {
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
    toBigIntFloat = blockchainModule.toBigIntFloat;
    const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
    client = clientModule.default;
    scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;
    const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
    getWalletByUserIdAndCurrency = walletModule.getWalletByUserIdAndCurrency;
    updateWalletBalance = walletModule.updateWalletBalance;
}
catch (e) {
}
const emails_1 = require("../../../../utils/emails");
const db_1 = require("@b/db");
const ws_1 = require("./ws");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
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
const calculateMargin = (position, matchedPrice) => {
    if (!toBigIntFloat) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Ecosystem extension not available" });
    }
    const currentPriceBigInt = toBigIntFloat(matchedPrice);
    const entryPriceBigInt = position.entryPrice;
    const leverageBigInt = BigInt(position.leverage);
    if (entryPriceBigInt === BigInt(0)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Entry price cannot be zero" });
    }
    const priceDifferenceBigInt = position.side === "BUY"
        ? currentPriceBigInt - entryPriceBigInt
        : entryPriceBigInt - currentPriceBigInt;
    const entryPriceWithLeverageBigInt = entryPriceBigInt / leverageBigInt;
    const marginBigInt = (priceDifferenceBigInt * BigInt(1000000000000000000)) /
        entryPriceWithLeverageBigInt;
    const margin = Number(marginBigInt) / 1000000000000000000;
    return margin;
};
const checkForLiquidation = async (position, matchedPrice) => {
    if (!toBigIntFloat) {
        console.warn("Ecosystem extension not available for liquidation checks");
        return;
    }
    const margin = calculateMargin(position, matchedPrice);
    const partialLiquidationThreshold = -0.8;
    const fullLiquidationThreshold = -1.0;
    if (margin <= partialLiquidationThreshold &&
        margin > fullLiquidationThreshold) {
        await (0, exports.liquidatePosition)(position, matchedPrice, true);
    }
    else if (margin <= fullLiquidationThreshold) {
        await (0, exports.liquidatePosition)(position, matchedPrice);
    }
};
exports.checkForLiquidation = checkForLiquidation;
const liquidatePosition = async (position, matchedPrice, partial = false) => {
    if (!client || !scyllaFuturesKeyspace || !fromBigInt || !getWalletByUserIdAndCurrency || !updateWalletBalance) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Ecosystem extension not available" });
    }
    const amountToLiquidate = partial
        ? (position.amount * BigInt(80)) / BigInt(100)
        : position.amount;
    const baseCurrency = position.symbol.split("/")[1];
    const wallet = await getWalletByUserIdAndCurrency(position.userId, baseCurrency);
    const idempotencyKey = `futures_liquidation_${position.id}`;
    if (wallet) {
        const amountToRefund = fromBigInt(amountToLiquidate) * fromBigInt(position.entryPrice);
        await db_1.sequelize.transaction(async (t) => {
            await updateWalletBalance(wallet, amountToRefund, "add", idempotencyKey, t);
        });
        try {
            await executeScyllaWithRetry(async () => {
                await client.execute(`UPDATE ${scyllaFuturesKeyspace}.position SET amount = ?, status = ? WHERE "userId" = ? AND id = ?`, [
                    partial ? amountToLiquidate.toString() : "0",
                    partial ? "PARTIALLY_LIQUIDATED" : "LIQUIDATED",
                    position.userId,
                    position.id,
                ], { prepare: true });
            });
        }
        catch (scyllaErr) {
            console_1.logger.error("FUTURES_LIQUIDATION", `Scylla position update FAILED after wallet credit succeeded. Money is safe; position still shows open. reconcileFuturesPositions will replay. idempotencyKey=${idempotencyKey} positionId=${position.id} userId=${position.userId} amount=${amountToRefund} partial=${partial}`, scyllaErr);
        }
    }
    else {
        await executeScyllaWithRetry(async () => {
            await client.execute(`UPDATE ${scyllaFuturesKeyspace}.position SET amount = ?, status = ? WHERE "userId" = ? AND id = ?`, [
                partial ? amountToLiquidate.toString() : "0",
                partial ? "PARTIALLY_LIQUIDATED" : "LIQUIDATED",
                position.userId,
                position.id,
            ], { prepare: true });
        });
    }
    await (0, ws_1.handlePositionBroadcast)(position);
    const user = await db_1.models.user.findOne({ where: { id: position.userId } });
    if (user && user.email) {
        if (partial) {
            await sendPartialLiquidationNotificationEmail(user, position, matchedPrice);
        }
        else {
            await sendLiquidationNotificationEmail(user, position, matchedPrice);
        }
    }
};
exports.liquidatePosition = liquidatePosition;
const sendWarningEmail = async (userId, position, margin, matchedPrice) => {
    const user = await db_1.models.user.findOne({ where: { id: userId } });
    if (user && user.email) {
        await sendLiquidationWarningEmail(user, position, margin, matchedPrice);
    }
};
exports.sendWarningEmail = sendWarningEmail;
async function sendLiquidationWarningEmail(user, position, margin, matchedPrice) {
    const emailType = "LiquidationWarning";
    const emailData = {
        TO: user.email,
        FIRSTNAME: user.firstName,
        SYMBOL: position.symbol,
        MARGIN: margin.toFixed(2),
        LEVERAGE: position.leverage,
        ENTRY_PRICE: fromBigInt ? fromBigInt(position.entryPrice) : position.entryPrice,
        CURRENT_PRICE: matchedPrice,
    };
    await emails_1.emailQueue.add({ emailData, emailType });
}
async function sendPartialLiquidationNotificationEmail(user, position, matchedPrice) {
    const emailType = "PartialLiquidationNotification";
    const emailData = {
        TO: user.email,
        FIRSTNAME: user.firstName,
        SYMBOL: position.symbol,
        LEVERAGE: position.leverage,
        ENTRY_PRICE: fromBigInt ? fromBigInt(position.entryPrice) : position.entryPrice,
        CURRENT_PRICE: matchedPrice,
    };
    await emails_1.emailQueue.add({ emailData, emailType });
}
async function sendLiquidationNotificationEmail(user, position, matchedPrice) {
    const emailType = "LiquidationNotification";
    const emailData = {
        TO: user.email,
        FIRSTNAME: user.firstName,
        SYMBOL: position.symbol,
        LEVERAGE: position.leverage,
        ENTRY_PRICE: fromBigInt ? fromBigInt(position.entryPrice) : position.entryPrice,
        CURRENT_PRICE: matchedPrice,
    };
    await emails_1.emailQueue.add({ emailData, emailType });
}
