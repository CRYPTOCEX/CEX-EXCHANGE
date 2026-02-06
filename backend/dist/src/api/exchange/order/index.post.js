"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.createOrder = createOrder;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const utils_1 = require("../utils");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const index_ws_1 = require("./index.ws");
const query_1 = require("@b/utils/query");
const utils_2 = require("./utils");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Create Order",
    operationId: "createOrder",
    tags: ["Exchange", "Orders"],
    description: "Creates a new order for the authenticated user.",
    requestBody: {
        description: "Order creation data.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: {
                            type: "string",
                            description: "Currency symbol (e.g., BTC)",
                        },
                        pair: {
                            type: "string",
                            description: "Pair symbol (e.g., USDT)",
                        },
                        type: {
                            type: "string",
                            description: "Order type (e.g., limit, market)",
                        },
                        side: {
                            type: "string",
                            description: "Order side (buy or sell)",
                        },
                        amount: {
                            type: "number",
                            description: "Order amount",
                        },
                        price: {
                            type: "number",
                            description: "Order price, required for limit orders",
                        },
                    },
                    required: ["currency", "pair", "type", "side", "amount"],
                },
            },
        },
        required: true,
    },
    responses: (0, query_1.createRecordResponses)("Order"),
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Create exchange order",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const { user, body, ctx } = data;
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "User not found" });
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const spotStatus = (await cacheManager.getSetting("spotStatus")) === "true";
    if (!spotStatus) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Spot trading is currently disabled",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking service availability");
        const unblockTime = await (0, utils_1.loadBanStatus)();
        if (await (0, utils_1.handleBanStatus)(unblockTime)) {
            const waitTime = unblockTime - Date.now();
            throw (0, error_1.createError)({
                statusCode: 503,
                message: `Service temporarily unavailable. Please try again in ${(0, utils_1.formatWaitTime)(waitTime)}.`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order parameters");
        const { currency, pair, amount, price, type } = body;
        const side = (_a = body.side) === null || _a === void 0 ? void 0 : _a.toUpperCase();
        if (!currency || !pair || !type || !side || amount == null) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Missing required parameters" });
        }
        if (!["BUY", "SELL"].includes(side)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid order side. Must be 'buy' or 'sell'" });
        }
        if (amount <= 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Amount must be greater than zero" });
        }
        if (type.toLowerCase() === "limit" && (price == null || price <= 0)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Price must be greater than zero for limit orders" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching market data for ${currency}/${pair}`);
        const symbol = `${currency}/${pair}`;
        const market = await db_1.models.exchangeMarket.findOne({
            where: { currency, pair },
        });
        if (!market || !market.metadata) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Market data not found" });
        }
        const metadata = typeof market.metadata === "string"
            ? JSON.parse(market.metadata)
            : market.metadata;
        const minAmount = Number(((_c = (_b = metadata === null || metadata === void 0 ? void 0 : metadata.limits) === null || _b === void 0 ? void 0 : _b.amount) === null || _c === void 0 ? void 0 : _c.min) || 0);
        const maxAmount = Number(((_e = (_d = metadata === null || metadata === void 0 ? void 0 : metadata.limits) === null || _d === void 0 ? void 0 : _d.amount) === null || _e === void 0 ? void 0 : _e.max) || 0);
        const minPrice = Number(((_g = (_f = metadata === null || metadata === void 0 ? void 0 : metadata.limits) === null || _f === void 0 ? void 0 : _f.price) === null || _g === void 0 ? void 0 : _g.min) || 0);
        const maxPrice = Number(((_j = (_h = metadata === null || metadata === void 0 ? void 0 : metadata.limits) === null || _h === void 0 ? void 0 : _h.price) === null || _j === void 0 ? void 0 : _j.max) || 0);
        const minCost = Number(((_l = (_k = metadata === null || metadata === void 0 ? void 0 : metadata.limits) === null || _k === void 0 ? void 0 : _k.cost) === null || _l === void 0 ? void 0 : _l.min) || 0);
        const maxCost = Number(((_o = (_m = metadata === null || metadata === void 0 ? void 0 : metadata.limits) === null || _m === void 0 ? void 0 : _m.cost) === null || _o === void 0 ? void 0 : _o.max) || 0);
        const amountPrecision = Number((_p = metadata.precision) === null || _p === void 0 ? void 0 : _p.amount) || 8;
        const pricePrecision = Number((_q = metadata.precision) === null || _q === void 0 ? void 0 : _q.price) || 8;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order limits and precision");
        if (side === "SELL" && amount < minAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount is too low, you need at least ${minAmount.toFixed(amountPrecision)} ${currency}`
            });
        }
        if (side === "SELL" && maxAmount > 0 && amount > maxAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount is too high, maximum is ${maxAmount.toFixed(amountPrecision)} ${currency}`
            });
        }
        if (price && price < minPrice) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Price is too low, you need at least ${minPrice.toFixed(pricePrecision)} ${pair}`
            });
        }
        if (maxPrice > 0 && price > maxPrice) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Price is too high, maximum is ${maxPrice.toFixed(pricePrecision)} ${pair}`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing exchange connection");
        const exchange = await exchange_1.default.startExchange(ctx);
        const provider = await exchange_1.default.getProvider();
        if (!exchange) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Exchange service is currently unavailable" });
        }
        let orderPrice = price;
        if (type.toLowerCase() === "market") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching current market price");
            const ticker = await exchange.fetchTicker(symbol);
            if (!ticker || !ticker.last) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Unable to fetch current market price" });
            }
            orderPrice = ticker.last;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating order cost");
        const formattedAmount = parseFloat(amount.toFixed(amountPrecision));
        const formattedPrice = parseFloat(orderPrice.toFixed(pricePrecision));
        const cost = parseFloat((formattedAmount * formattedPrice).toFixed(pricePrecision));
        if (side === "BUY" && cost < minCost) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cost is too low, you need at least ${minCost.toFixed(pricePrecision)} ${pair}`
            });
        }
        if (side === "BUY" && maxCost > 0 && cost > maxCost) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cost is too high, maximum is ${maxCost.toFixed(pricePrecision)} ${pair}`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking wallet balances for ${currency} and ${pair}`);
        const currencyWallet = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "SPOT", currency);
        const pairWallet = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "SPOT", pair);
        if (side === "BUY" && pairWallet.balance < cost) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Insufficient balance. You need at least ${cost.toFixed(pricePrecision)} ${pair}`
            });
        }
        if (side === "SELL" && currencyWallet.balance < amount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Insufficient balance. You need at least ${amount.toFixed(amountPrecision)} ${currency}`
            });
        }
        const feeRate = side === "BUY" ? Number(metadata.taker) : Number(metadata.maker);
        const feeCurrency = side === "BUY" ? currency : pair;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Creating ${type.toLowerCase()} ${side.toLowerCase()} order on exchange`);
        let order;
        try {
            order = await exchange.createOrder(symbol, type.toLowerCase(), side.toLowerCase(), formattedAmount, type.toLowerCase() === "limit" ? formattedPrice : undefined);
        }
        catch (error) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Unable to process order: ${(0, utils_1.sanitizeErrorMessage)(error.message)}`
            });
        }
        if (!order || !order.id) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Unable to process order" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching and adjusting order data");
        let orderData = await exchange.fetchOrder(order.id, symbol);
        if (!orderData) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to fetch order" });
        }
        orderData = (0, utils_2.adjustOrderData)(orderData, provider, feeRate);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating wallet balances and storing order");
        const idempotencyKey = `exchange_order_${order.id}`;
        const response = await db_1.sequelize.transaction(async (transaction) => {
            if (side === "BUY") {
                await wallet_1.walletService.debit({
                    idempotencyKey: `${idempotencyKey}_debit`,
                    userId: user.id,
                    walletId: pairWallet.id,
                    walletType: "SPOT",
                    currency: pair,
                    amount: cost,
                    operationType: "EXCHANGE_ORDER",
                    description: `Buy order: ${formattedAmount} ${currency} @ ${formattedPrice} ${pair}`,
                    metadata: {
                        orderId: order.id,
                        symbol,
                        side,
                        type,
                    },
                    transaction,
                });
                if (["closed", "filled"].includes(orderData.status)) {
                    const netAmount = Number(orderData.amount) - Number(orderData.fee || 0);
                    await wallet_1.walletService.credit({
                        idempotencyKey: `${idempotencyKey}_credit`,
                        userId: user.id,
                        walletId: currencyWallet.id,
                        walletType: "SPOT",
                        currency: currency,
                        amount: netAmount,
                        operationType: "EXCHANGE_ORDER_FILL",
                        fee: Number(orderData.fee || 0),
                        description: `Buy order filled: ${netAmount} ${currency}`,
                        metadata: {
                            orderId: order.id,
                            symbol,
                            side,
                            type,
                        },
                        transaction,
                    });
                }
            }
            else {
                await wallet_1.walletService.debit({
                    idempotencyKey: `${idempotencyKey}_debit`,
                    userId: user.id,
                    walletId: currencyWallet.id,
                    walletType: "SPOT",
                    currency: currency,
                    amount: formattedAmount,
                    operationType: "EXCHANGE_ORDER",
                    description: `Sell order: ${formattedAmount} ${currency} @ ${formattedPrice} ${pair}`,
                    metadata: {
                        orderId: order.id,
                        symbol,
                        side,
                        type,
                    },
                    transaction,
                });
                if (["closed", "filled"].includes(orderData.status)) {
                    const proceeds = Number(orderData.amount) * Number(orderData.price);
                    const netProceeds = proceeds - Number(orderData.fee || 0);
                    await wallet_1.walletService.credit({
                        idempotencyKey: `${idempotencyKey}_credit`,
                        userId: user.id,
                        walletId: pairWallet.id,
                        walletType: "SPOT",
                        currency: pair,
                        amount: netProceeds,
                        operationType: "EXCHANGE_ORDER_FILL",
                        fee: Number(orderData.fee || 0),
                        description: `Sell order filled: ${netProceeds} ${pair}`,
                        metadata: {
                            orderId: order.id,
                            symbol,
                            side,
                            type,
                        },
                        transaction,
                    });
                }
            }
            const response = await createOrder(user.id, {
                ...orderData,
                referenceId: order.id,
                fee: Number(orderData.fee || 0),
                feeCurrency,
            }, transaction);
            return response;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding order to tracking system");
        (0, index_ws_1.addOrderToTrackedOrders)(user.id, {
            id: response.id,
            status: response.status,
            price: orderData.price,
            amount: orderData.amount,
            filled: orderData.filled,
            remaining: orderData.remaining,
            timestamp: orderData.timestamp,
            cost: orderData.cost,
        });
        (0, index_ws_1.addUserToWatchlist)(user.id);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Order created successfully: ${side} ${formattedAmount} ${currency} @ ${type.toLowerCase() === 'market' ? 'market price' : formattedPrice + ' ' + pair}`);
        return { message: "Order created successfully" };
    }
    catch (error) {
        console_1.logger.error("EXCHANGE", "Error creating order", error);
        throw (0, error_1.createError)({ statusCode: error.statusCode || 500, message: (0, utils_1.sanitizeErrorMessage)(error.message) });
    }
};
async function createOrder(userId, order, transaction) {
    const mappedOrder = mapOrderData(order);
    const newOrder = await db_1.models.exchangeOrder.create({
        ...mappedOrder,
        userId: userId,
    }, { transaction });
    return newOrder.get({ plain: true });
}
const mapOrderData = (order) => {
    return {
        referenceId: order.referenceId,
        status: order.status ? order.status.toUpperCase() : undefined,
        symbol: order.symbol,
        type: order.type ? order.type.toUpperCase() : undefined,
        timeInForce: order.timeInForce
            ? order.timeInForce.toUpperCase()
            : undefined,
        side: order.side ? order.side.toUpperCase() : undefined,
        price: Number(order.price),
        average: order.average != null ? Number(order.average) : undefined,
        amount: Number(order.amount),
        filled: Number(order.filled),
        remaining: Number(order.remaining),
        cost: Number(order.cost),
        trades: JSON.stringify(order.trades),
        fee: Number(order.fee || 0),
        feeCurrency: order.feeCurrency,
    };
};
