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
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const blockchain_1 = require("@b/api/(ext)/ecosystem/utils/blockchain");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const ws_1 = require("@b/api/(ext)/ecosystem/utils/ws");
exports.metadata = {
    summary: "Creates a new trading order",
    description: "Submits a new trading order for the logged-in user.",
    operationId: "createOrder",
    tags: ["Trading", "Orders"],
    logModule: "ECO_ORDER",
    logTitle: "Create trading order",
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
                            description: "Order type, limit or market",
                        },
                        side: { type: "string", description: "Order side, buy or sell" },
                        amount: { type: "number", description: "Amount of the order" },
                        price: {
                            type: "number",
                            description: "Price of the order (required if limit)",
                        },
                    },
                    required: ["currency", "pair", "type", "side", "amount"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Order"),
    requiresAuth: true,
};
async function getBestPriceFromOrderBook(symbol, side) {
    const { asks, bids } = await (0, queries_1.getOrderBook)(symbol);
    if (side.toUpperCase() === "BUY") {
        if (!asks || asks.length === 0)
            return null;
        return asks[0][0];
    }
    else {
        if (!bids || bids.length === 0)
            return null;
        return bids[0][0];
    }
}
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency, pair, amount, price, type, side } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order request");
    if (!amount || Number(amount) <= 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid amount");
        throw (0, error_1.createError)({
            statusCode: 422,
            message: "Amount must be greater than zero.",
        });
    }
    if (!type) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Order type missing");
        throw (0, error_1.createError)({
            statusCode: 422,
            message: "Order type (limit/market) is required.",
        });
    }
    if (!currency || !pair) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid currency or pair");
        throw (0, error_1.createError)({
            statusCode: 422,
            message: "Invalid currency/pair symbol.",
        });
    }
    const symbol = `${currency}/${pair}`;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching market configuration");
        const market = (await db_1.models.ecosystemMarket.findOne({
            where: { currency, pair },
        }));
        if (!market || !market.metadata) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Market not found");
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Market data not found or incomplete.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating market metadata");
        if (!market.metadata.precision ||
            !market.metadata.precision.amount ||
            !market.metadata.precision.price) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Market metadata incomplete");
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Market metadata missing precision details.",
            });
        }
        if (!market.metadata.maker || !market.metadata.taker) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Market fee rates missing");
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Market metadata missing fee rates.",
            });
        }
        const minAmount = Number(((_c = (_b = (_a = market.metadata) === null || _a === void 0 ? void 0 : _a.limits) === null || _b === void 0 ? void 0 : _b.amount) === null || _c === void 0 ? void 0 : _c.min) || 0);
        const maxAmount = Number(((_f = (_e = (_d = market.metadata) === null || _d === void 0 ? void 0 : _d.limits) === null || _e === void 0 ? void 0 : _e.amount) === null || _f === void 0 ? void 0 : _f.max) || 0);
        const minPrice = Number(((_j = (_h = (_g = market.metadata) === null || _g === void 0 ? void 0 : _g.limits) === null || _h === void 0 ? void 0 : _h.price) === null || _j === void 0 ? void 0 : _j.min) || 0);
        const maxPrice = Number(((_m = (_l = (_k = market.metadata) === null || _k === void 0 ? void 0 : _k.limits) === null || _l === void 0 ? void 0 : _l.price) === null || _m === void 0 ? void 0 : _m.max) || 0);
        const minCost = Number(((_q = (_p = (_o = market.metadata) === null || _o === void 0 ? void 0 : _o.limits) === null || _p === void 0 ? void 0 : _p.cost) === null || _q === void 0 ? void 0 : _q.min) || 0);
        const maxCost = Number(((_t = (_s = (_r = market.metadata) === null || _r === void 0 ? void 0 : _r.limits) === null || _s === void 0 ? void 0 : _s.cost) === null || _t === void 0 ? void 0 : _t.max) || 0);
        if (side.toUpperCase() === "SELL" && amount < minAmount) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: `Amount is too low, you need at least ${minAmount} ${currency}`,
            });
        }
        if (side.toUpperCase() === "BUY" && amount < minAmount) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: `Amount is too low, minimum is ${minAmount} ${currency}`,
            });
        }
        if (side.toUpperCase() === "SELL" && maxAmount > 0 && amount > maxAmount) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: `Amount is too high, maximum is ${maxAmount} ${currency}`,
            });
        }
        if (type.toLowerCase() === "limit" && (!price || price <= 0)) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Price must be greater than zero for limit orders.",
            });
        }
        let effectivePrice = price;
        if (type.toLowerCase() === "market") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Determining market price from order book");
            const bestPrice = await getBestPriceFromOrderBook(symbol, side);
            if (!bestPrice) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("No market price available");
                throw (0, error_1.createError)({
                    statusCode: 422,
                    message: "Cannot execute market order: no price available.",
                });
            }
            effectivePrice = bestPrice;
        }
        if (effectivePrice && effectivePrice < minPrice) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: `Price is too low, you need at least ${minPrice} ${pair}`,
            });
        }
        if (maxPrice > 0 && effectivePrice && effectivePrice > maxPrice) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: `Price is too high, maximum is ${maxPrice} ${pair}`,
            });
        }
        const precision = Number(side.toUpperCase() === "BUY"
            ? market.metadata.precision.amount
            : market.metadata.precision.price) || 8;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Determining maker/taker fee structure");
        let isTaker = false;
        if (type.toLowerCase() === "market") {
            isTaker = true;
        }
        else {
            const { asks, bids } = await (0, queries_1.getOrderBook)(symbol);
            if (side.toUpperCase() === "BUY") {
                if (asks && asks.length > 0 && effectivePrice >= asks[0][0]) {
                    isTaker = true;
                }
            }
            else {
                if (bids && bids.length > 0 && effectivePrice <= bids[0][0]) {
                    isTaker = true;
                }
            }
        }
        const feeRate = isTaker
            ? Number(market.metadata.taker)
            : Number(market.metadata.maker);
        if (isNaN(feeRate) || feeRate < 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid fee rate");
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Invalid fee rate from market metadata.",
            });
        }
        if (!effectivePrice || isNaN(effectivePrice)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid price");
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "No valid price determined for the order.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating order cost and fees");
        const feeCalculated = (amount * effectivePrice * feeRate) / 100;
        const fee = parseFloat(feeCalculated.toFixed(precision));
        const costCalculated = side.toUpperCase() === "BUY" ? amount * effectivePrice + fee : amount;
        const cost = parseFloat(costCalculated.toFixed(precision));
        if (side.toUpperCase() === "BUY" && (isNaN(cost) || cost <= 0)) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Calculated cost is invalid. Check your price and amount.",
            });
        }
        if (side.toUpperCase() === "BUY" && cost < minCost) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: `Cost is too low, you need at least ${minCost} ${pair}`,
            });
        }
        if (side.toUpperCase() === "BUY" && maxCost > 0 && cost > maxCost) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: `Cost is too high, maximum is ${maxCost} ${pair}`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving user wallets");
        const [currencyWallet, pairWallet] = await Promise.all([
            (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, currency),
            (0, wallet_1.getWalletByUserIdAndCurrency)(user.id, pair),
        ]);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying wallet balance");
        if (side.toUpperCase() === "SELL") {
            const spendableBalance = parseFloat(currencyWallet.balance.toString()) - (parseFloat(((_u = currencyWallet.inOrder) === null || _u === void 0 ? void 0 : _u.toString()) || "0"));
            if (!currencyWallet || spendableBalance < amount) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient ${currency} balance`);
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Insufficient balance. You need ${amount} ${currency}`,
                });
            }
        }
        else {
            const spendableBalance = parseFloat(pairWallet.balance.toString()) - (parseFloat(((_v = pairWallet.inOrder) === null || _v === void 0 ? void 0 : _v.toString()) || "0"));
            if (!pairWallet || spendableBalance < cost) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient ${pair} balance`);
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Insufficient balance. You need ${cost} ${pair}`,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for self-matching orders");
        const userOpenOrders = await (0, queries_1.getOrders)(user.id, symbol, true);
        if (side.toUpperCase() === "SELL") {
            const conflictingBuy = userOpenOrders.find((o) => o.side === "BUY" && o.price >= effectivePrice);
            if (conflictingBuy) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Self-matching order detected");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `You already have a BUY order at ${conflictingBuy.price} or higher, cannot place SELL at ${effectivePrice} or lower.`,
                });
            }
        }
        if (side.toUpperCase() === "BUY") {
            const conflictingSell = userOpenOrders.find((o) => o.side === "SELL" && o.price <= effectivePrice);
            if (conflictingSell) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Self-matching order detected");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `You already have a SELL order at ${conflictingSell.price} or lower, cannot place BUY at ${effectivePrice} or higher.`,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating order in database");
        const newOrder = await (0, queries_1.createOrder)({
            userId: user.id,
            symbol,
            amount: (0, blockchain_1.toBigIntFloat)(amount),
            price: (0, blockchain_1.toBigIntFloat)(effectivePrice),
            cost: (0, blockchain_1.toBigIntFloat)(cost),
            type,
            side,
            fee: (0, blockchain_1.toBigIntFloat)(fee),
            feeCurrency: pair,
        });
        const order = {
            ...newOrder,
            amount: (0, blockchain_1.fromBigInt)(newOrder.amount),
            price: (0, blockchain_1.fromBigInt)(newOrder.price),
            cost: (0, blockchain_1.fromBigInt)(newOrder.cost),
            fee: (0, blockchain_1.fromBigInt)(newOrder.fee),
            remaining: (0, blockchain_1.fromBigInt)(newOrder.remaining),
            filled: 0,
            average: 0,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating wallet balance");
        try {
            if (side.toUpperCase() === "BUY") {
                const idempotencyKey = `eco_order_place_${newOrder.id}_buy_${pairWallet.id}`;
                await (0, wallet_1.updateWalletBalance)(pairWallet, order.cost, "subtract", idempotencyKey);
            }
            else {
                const idempotencyKey = `eco_order_place_${newOrder.id}_sell_${currencyWallet.id}`;
                await (0, wallet_1.updateWalletBalance)(currencyWallet, order.amount, "subtract", idempotencyKey);
            }
        }
        catch (e) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Rolling back order due to wallet update failure");
            await (0, queries_1.rollbackOrderCreation)(newOrder.id, user.id, newOrder.createdAt);
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update wallet balance");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to update wallet balance. Order rolled back.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding order to matching engine");
        await (0, queries_1.addOrderToMatchingQueue)(newOrder);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting order to WebSocket subscribers");
        await (0, ws_1.handleOrderBroadcast)({
            ...newOrder,
            status: "OPEN",
        });
        try {
            const { triggerCopyTrading } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            triggerCopyTrading(newOrder.id, user.id, symbol, side.toUpperCase(), type.toUpperCase(), amount, effectivePrice).catch(() => {
            });
        }
        catch (importError) {
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created ${side} order for ${amount} ${currency} at ${effectivePrice} ${pair}`);
        return {
            message: "Order created successfully",
            order: order,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Order creation failed: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 400,
            message: `Failed to create order: ${error.message}`,
        });
    }
};
