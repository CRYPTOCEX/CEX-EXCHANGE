"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/wallet/utils");
let fromBigInt;
let toBigIntFloat;
let fromBigIntMultiply;
let updateWalletBalance;
try {
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
    toBigIntFloat = blockchainModule.toBigIntFloat;
    fromBigIntMultiply = blockchainModule.fromBigIntMultiply;
    const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
    updateWalletBalance = walletModule.updateWalletBalance;
}
catch (e) {
}
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const order_1 = require("@b/api/(ext)/futures/utils/queries/order");
const affiliate_1 = require("@b/utils/affiliate");
exports.metadata = {
    summary: "Creates a new futures trading order",
    description: "Submits a new futures trading order for the logged-in user.",
    operationId: "createFuturesOrder",
    tags: ["Futures", "Orders"],
    logModule: "FUTURES",
    logTitle: "Create futures order",
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
                        type: {
                            type: "string",
                            description: "Order type, e.g., limit, market",
                        },
                        side: {
                            type: "string",
                            description: "Order side, either buy or sell",
                        },
                        amount: { type: "number", description: "Amount of the order" },
                        price: {
                            type: "number",
                            description: "Price of the order (not required for market orders)",
                        },
                        reduceOnly: { type: "boolean" },
                        postOnly: { type: "boolean" },
                        timeInForce: { type: "string" },
                        leverage: {
                            type: "number",
                            description: "Leverage for the futures order",
                        },
                        stopLossPrice: {
                            type: "number",
                            description: "Stop loss price for the order",
                            nullable: true,
                        },
                        takeProfitPrice: {
                            type: "number",
                            description: "Take profit price for the order",
                            nullable: true,
                        },
                    },
                    required: ["currency", "pair", "type", "side", "amount", "leverage"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Order"),
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14;
    const { body, user, ctx, headers } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency, pair, amount, price, type, side, leverage, stopLossPrice, takeProfitPrice, } = body;
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Validating request parameters");
    if (!currency || !pair) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Invalid symbol");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid symbol" });
    }
    if (type === "MARKET") throw (0, error_1.createError)({ statusCode: 422, message: "Market futures orders are currently unavailable. Use a limit order." });
    if (!["BUY", "SELL"].includes(side) || !["LIMIT", "MARKET"].includes(type) || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(leverage) || leverage < 1) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid side, type, amount, price or leverage" });
    }
    if (body.reduceOnly || body.postOnly || (body.timeInForce && body.timeInForce !== "GTC")) throw (0, error_1.createError)({ statusCode: 422, message: "The requested execution option is not supported for this futures order" });
    if (stopLossPrice != null || takeProfitPrice != null) throw (0, error_1.createError)({ statusCode: 422, message: "Futures protective orders require the position settlement implementation" });
    for (const trigger of [stopLossPrice, takeProfitPrice]) {
        if (trigger != null && (!Number.isFinite(trigger) || trigger <= 0)) throw (0, error_1.createError)({ statusCode: 400, message: "Invalid stop or take-profit price" });
    }
    if (typeof toBigIntFloat !== "function" || typeof fromBigInt !== "function") throw (0, error_1.createError)({ statusCode: 503, message: "Futures numeric dependencies unavailable" });
    const symbol = `${currency}/${pair}`;
    try {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Fetching futures market for ${symbol}`);
        const market = (await db_1.models.futuresMarket.findOne({
            where: { currency, pair },
        }));
        if (!market || market.status === false) {
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, "Futures market data not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Futures market data not found" });
        }
        if (!market.metadata) {
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, "Futures market metadata not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Futures market metadata not found" });
        }
        const configuredLeverages = String(market.metadata.limits?.leverage ?? "").split(",").map((value) => Number(value.trim())).filter((value) => Number.isSafeInteger(value) && value > 0);
        const allowedLeverages = configuredLeverages.length ? configuredLeverages : [1, 5, 10, 20, 50, 100];
        if (!allowedLeverages.includes(leverage)) throw (0, error_1.createError)({ statusCode: 400, message: "Leverage is not available for this market" });
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, "Validating order parameters against market limits");
        const minAmount = Number(((_l = (_k = (_j = market.metadata) === null || _j === void 0 ? void 0 : _j.limits) === null || _k === void 0 ? void 0 : _k.amount) === null || _l === void 0 ? void 0 : _l.min) || 0);
        const maxAmount = Number(((_p = (_o = (_m = market.metadata) === null || _m === void 0 ? void 0 : _m.limits) === null || _o === void 0 ? void 0 : _o.amount) === null || _p === void 0 ? void 0 : _p.max) || 0);
        const minPrice = Number(((_s = (_r = (_q = market.metadata) === null || _q === void 0 ? void 0 : _q.limits) === null || _r === void 0 ? void 0 : _r.price) === null || _s === void 0 ? void 0 : _s.min) || 0);
        const maxPrice = Number(((_v = (_u = (_t = market.metadata) === null || _t === void 0 ? void 0 : _t.limits) === null || _u === void 0 ? void 0 : _u.price) === null || _v === void 0 ? void 0 : _v.max) || 0);
        const minCost = Number(((_y = (_x = (_w = market.metadata) === null || _w === void 0 ? void 0 : _w.limits) === null || _x === void 0 ? void 0 : _x.cost) === null || _y === void 0 ? void 0 : _y.min) || 0);
        const maxCost = Number(((_1 = (_0 = (_z = market.metadata) === null || _z === void 0 ? void 0 : _z.limits) === null || _0 === void 0 ? void 0 : _0.cost) === null || _1 === void 0 ? void 0 : _1.max) || 0);
        if (amount < minAmount) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Amount is too low. You need ${minAmount} ${currency}` });
        }
        if (maxAmount > 0 && amount > maxAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount is too high. Maximum is ${maxAmount} ${currency}`
            });
        }
        if (price && price < minPrice) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Price is too low. You need ${minPrice} ${pair}` });
        }
        if (maxPrice > 0 && price > maxPrice) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Price is too high. Maximum is ${maxPrice} ${pair}` });
        }
        const precision = Number(market.metadata.precision?.price ?? 8);
        const feeRate = side === "BUY"
            ? Number(market.metadata.taker)
            : Number(market.metadata.maker);
        const feeCalculated = (amount * price * feeRate) / 100;
        if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 100 || !Number.isSafeInteger(precision) || precision < 0 || precision > 18) throw (0, error_1.createError)({ statusCode: 422, message: "Invalid market fee or precision configuration" });
        const fee = parseFloat(feeCalculated.toFixed(precision));
        const notional = amount * price;
        const cost = notional / leverage;
        if (!Number.isFinite(cost + fee) || cost <= 0) throw (0, error_1.createError)({ statusCode: 400, message: "Order cost is invalid" });
        if (notional < minCost) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Cost is too low. You need ${minCost} ${pair}` });
        }
        if (maxCost > 0 && notional > maxCost) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Cost is too high. Maximum is ${maxCost} ${pair}` });
        }
        (_2 = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _2 === void 0 ? void 0 : _2.call(ctx, `Fetching ${pair} wallet`);
        const pairWallet = await (0, utils_1.getWalletSafe)(user.id, "FUTURES", pair, false, ctx);
        if (!pairWallet) {
            (_3 = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _3 === void 0 ? void 0 : _3.call(ctx, `Wallet not found for ${pair}`);
            throw (0, error_1.createError)({ statusCode: 400, message: `Insufficient balance. You need ${cost + fee} ${pair}` });
        }
        (_10 = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _10 === void 0 ? void 0 : _10.call(ctx, `Creating new ${side} order for ${amount} ${currency} at ${price} ${pair}`);
        const newOrder = await (0, order_1.createOrder)({
            userId: user.id,
            clientKey: headers?.["idempotency-key"],
            symbol,
            amount: toBigIntFloat(amount),
            price: toBigIntFloat(price),
            cost: toBigIntFloat(cost),
            type,
            side,
            fee: toBigIntFloat(fee),
            feeCurrency: pair,
            leverage,
            stopLossPrice: stopLossPrice ? toBigIntFloat(stopLossPrice) : undefined,
            takeProfitPrice: takeProfitPrice
                ? toBigIntFloat(takeProfitPrice)
                : undefined,
        });
        (_11 = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _11 === void 0 ? void 0 : _11.call(ctx, "Formatting order response");
        const order = {
            ...newOrder,
            amount: fromBigInt(newOrder.amount),
            price: fromBigInt(newOrder.price),
            cost: fromBigInt(newOrder.cost),
            fee: fromBigInt(newOrder.fee),
            remaining: fromBigInt(newOrder.remaining),
            leverage,
            stopLossPrice: newOrder.stopLossPrice
                ? fromBigInt(newOrder.stopLossPrice)
                : undefined,
            takeProfitPrice: newOrder.takeProfitPrice
                ? fromBigInt(newOrder.takeProfitPrice)
                : undefined,
            filled: fromBigInt(newOrder.filled),
            average: 0,
        };
        (_12 = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _12 === void 0 ? void 0 : _12.call(ctx, `Deducting ${cost + fee} ${pair} from wallet`);
        try {
            const { FuturesMatchingEngine } = require("@b/api/(ext)/futures/utils/matchingEngine");
            const engine = await FuturesMatchingEngine.getInstance();
            await engine.processQueue();
        } catch (queueError) {
            // Funds and order are durable; never report a failed placement and
            // invite a fresh request because a best-effort cycle kick failed.
            console.error("Futures order funded; matching refresh pending", queueError);
        }
        try {
            await (0, affiliate_1.processRewards)(user.id, cost, "FUTURES_TRADE", pair, `FUTURES_TRADE:order:${String(newOrder.id)}`, ctx);
        }
        catch (affiliateError) {
            console.error("Failed to process affiliate rewards:", affiliateError);
        }
        (_13 = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _13 === void 0 ? void 0 : _13.call(ctx, `Futures order created successfully (ID: ${newOrder.id})`);
        return {
            message: "Futures order created successfully",
            order,
        };
    }
    catch (error) {
        console.error("Error creating futures order:", error);
        (_14 = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _14 === void 0 ? void 0 : _14.call(ctx, `Failed to create order: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 503,
            message: `Failed to create futures order: ${error.message}`,
        });
    }
};
