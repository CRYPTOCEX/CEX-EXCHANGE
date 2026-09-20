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
const fees_1 = require("@b/utils/fees");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
const kyc_1 = require("@b/utils/kyc");
const attestation_1 = require("@b/utils/attestation");
const time_in_force_1 = require("./util/time-in-force");
const precision_1 = require("./util/precision");
const { placeReservedSpotOrder } = require("./util/placement");
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
                        timeInForce: {
                            type: "string",
                            description: `Time in force, LIMIT orders only: ${time_in_force_1.TIME_IN_FORCE_VALUES.join(", ")}. Absent means GTC. Which of them a market accepts depends on the connected provider — see GET /api/exchange/order/capabilities.`,
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
    var _r, _s, _t, _u;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "User not found" });
    }
    await (0, attestation_1.assertAttestedOnNativeApp)(data, user.id, "trade");
    const cacheManager = cache_1.CacheManager.getInstance();
    const spotStatus = await cacheManager.getSettingBool("spotWallets", true);
    if (!spotStatus) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Spot trading is currently disabled",
        });
    }
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.TRADE, "trade");
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
        if (!["limit", "market"].includes(String(type).toLowerCase())) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Only limit and market orders are supported on this market. A stop order placed here would be submitted without its trigger price.",
            });
        }
        if (amount <= 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Amount must be greater than zero" });
        }
        if (type.toLowerCase() === "limit" && (price == null || price <= 0)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Price must be greater than zero for limit orders" });
        }
        let timeInForce;
        try {
            timeInForce = (0, time_in_force_1.parseTimeInForce)(body === null || body === void 0 ? void 0 : body.timeInForce);
        }
        catch (error) {
            if (error instanceof time_in_force_1.InvalidTimeInForceError) {
                throw (0, error_1.createError)({ statusCode: 422, message: error.message });
            }
            throw error;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching market data for ${currency}/${pair}`);
        const symbol = `${currency}/${pair}`;
        const market = await db_1.models.exchangeMarket.findOne({
            where: { currency, pair },
        });
        if (!market || !market.metadata) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Market data not found" });
        }
        if (!market.status) throw (0, error_1.createError)(400, "This spot market is disabled");
        const metadata = typeof market.metadata === "string"
            ? JSON.parse(market.metadata)
            : market.metadata;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing exchange connection");
        const exchange = await exchange_1.default.startExchange(ctx);
        const provider = await exchange_1.default.getProvider();
        if (!exchange) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Exchange service is currently unavailable" });
        }
        const placement = (0, time_in_force_1.resolveTimeInForce)({
            provider,
            type: String(type).toLowerCase(),
            timeInForce,
        });
        if (!placement.ok) {
            throw (0, error_1.createError)({ statusCode: 422, message: placement.message });
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
        const { formattedAmount, formattedPrice, cost } = (0, precision_1.prepareSpotOrder)(exchange, symbol, amount, orderPrice, metadata.limits);
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking wallet balances for ${currency} and ${pair}`);
        const currencyWallet = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "SPOT", currency);
        const pairWallet = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "SPOT", pair);
        const feeRate = side === "BUY" ? Number(metadata.taker) : Number(metadata.maker);
        if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate >= 100)
            throw (0, error_1.createError)(400, "Invalid platform trading fee configuration");
        const feeCurrency = side === "BUY" ? currency : pair;
        const response = await placeReservedSpotOrder({ exchange, provider, userId:user.id, symbol, side, type:String(type).toLowerCase(), amount:formattedAmount, requestedAmount:amount, price:formattedPrice, cost, feeRate, timeInForce, params:placement.params, inputWalletId:side === "BUY" ? pairWallet.id : currencyWallet.id, clientKey:data.headers?.["idempotency-key"] });
        (0, index_ws_1.addOrderToTrackedOrders)(user.id, response);
        (0, index_ws_1.addUserToWatchlist)(user.id);
        return { message: response.referenceId ? "Order submitted; settlement is tracked automatically." : "Order submission is pending reconciliation; do not submit a replacement.", orderId:response.id, status:response.status };

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
    var _a;
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
        metadata: (_a = order.metadata) !== null && _a !== void 0 ? _a : undefined,
    };
};
