"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
let fromBigInt;
let updateWalletBalance;
try {
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
    const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
    updateWalletBalance = walletModule.updateWalletBalance;
}
catch (e) {
}
const query_1 = require("@b/utils/query");
const positions_1 = require("@b/api/(ext)/futures/utils/queries/positions");
const utils_1 = require("@b/api/finance/wallet/utils");
exports.metadata = {
    summary: "Closes an open futures position",
    description: "Closes an open futures position for the logged-in user.",
    operationId: "closeFuturesPosition",
    tags: ["Futures", "Positions"],
    logModule: "FUTURES",
    logTitle: "Close futures position",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: {
                            type: "string",
                            description: "Currency symbol (e.g., BTC)",
                        },
                        pair: { type: "string", description: "Pair symbol (e.g., USDT)" },
                        side: {
                            type: "string",
                            description: "Position side, either buy or sell",
                        },
                    },
                    required: ["currency", "pair", "side"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Position closed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Success message" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Position"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const { body, user, ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency, pair, side } = body;
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Validating request parameters");
    if (!currency || !pair || !side) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Missing required parameters");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid request parameters",
        });
    }
    const symbol = `${currency}/${pair}`;
    try {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Fetching position for ${symbol} (${side})`);
        const position = await (0, positions_1.getPosition)(user.id, symbol, side);
        if (!position) {
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, "Position not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Position not found",
            });
        }
        if (position.status !== "OPEN") {
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, "Position is not open");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Position is not open",
            });
        }
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, "Calculating final balance change");
        const finalBalanceChange = calculateFinalBalanceChange(position);
        (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, `Fetching ${pair} wallet`);
        const wallet = await (0, utils_1.getWallet)(position.userId, "FUTURES", symbol.split("/")[1], false, ctx);
        if (wallet) {
            if (!updateWalletBalance) {
                (_k = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _k === void 0 ? void 0 : _k.call(ctx, "Ecosystem extension not available");
                throw (0, error_1.createError)({ statusCode: 500, message: "Ecosystem extension not available for wallet operations" });
            }
            (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, `Updating wallet balance by ${finalBalanceChange > 0 ? "+" : ""}${finalBalanceChange}`);
            if (finalBalanceChange > 0) {
                await updateWalletBalance(wallet, finalBalanceChange, "add");
            }
            else {
                await updateWalletBalance(wallet, Math.abs(finalBalanceChange), "subtract");
            }
        }
        (_m = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _m === void 0 ? void 0 : _m.call(ctx, "Updating position status to CLOSED");
        await (0, positions_1.updatePositionStatus)(position.userId, position.id, "CLOSED");
        (_o = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _o === void 0 ? void 0 : _o.call(ctx, `Position closed successfully for ${symbol}`);
        return { message: "Position closed and balance updated successfully" };
    }
    catch (error) {
        (_p = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _p === void 0 ? void 0 : _p.call(ctx, `Failed to close position: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to close position: ${error.message}`,
        });
    }
};
const calculateFinalBalanceChange = (position) => {
    if (!fromBigInt) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Ecosystem extension not available for number conversion" });
    }
    const entryPrice = fromBigInt(position.entryPrice);
    const amount = fromBigInt(position.amount);
    const unrealizedPnl = fromBigInt(position.unrealizedPnl);
    const investedAmount = entryPrice * amount;
    const finalBalanceChange = investedAmount + unrealizedPnl;
    return finalBalanceChange;
};
