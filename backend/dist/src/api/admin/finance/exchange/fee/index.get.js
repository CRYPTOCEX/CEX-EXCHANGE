"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const ccxt_1 = __importDefault(require("ccxt"));
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Calculates and compares the fees for exchange orders, grouped by fee currency",
    description: "Fetches the orders, calculates the fees, and groups them by fee currency.",
    operationId: "getOrderFeesByCurrency",
    tags: ["Admin", "Exchange", "Fees"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Fees calculated and compared successfully, grouped by fee currency",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            feesComparison: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        currency: {
                                            type: "string",
                                            description: "The fee currency",
                                        },
                                        totalAmount: {
                                            type: "number",
                                            description: "The total order amount",
                                        },
                                        totalCalculatedFee: {
                                            type: "number",
                                            description: "The total calculated fee",
                                        },
                                        totalExchangeFee: {
                                            type: "number",
                                            description: "The total fee from the exchange",
                                        },
                                        totalExtraFee: {
                                            type: "number",
                                            description: "The total extra fee we charged",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    permission: "view.exchange.fee",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const exchange = await exchange_1.default.startExchange(ctx);
        if (!exchange) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Exchange or provider not available",
            });
        }
        const markets = await exchange.fetchMarkets();
        const orders = await db_1.models.exchangeOrder.findAll({
            where: { userId: user.id },
            attributes: ["id", "amount", "fee", "symbol", "side", "feeCurrency"],
        });
        const feeSummary = {};
        orders.forEach((order) => {
            const market = markets.find((m) => m.symbol === order.symbol);
            const exchangeFeeRate = order.side === "BUY" ? market.taker : market.maker;
            const calculatedFee = (order.amount * order.fee) / 100;
            const exchangeFeeAmount = (order.amount * exchangeFeeRate) / 100;
            const extraFee = calculatedFee - exchangeFeeAmount;
            if (!feeSummary[order.feeCurrency]) {
                feeSummary[order.feeCurrency] = {
                    currency: order.feeCurrency,
                    totalAmount: 0,
                    totalCalculatedFee: 0,
                    totalExchangeFee: 0,
                    totalExtraFee: 0,
                };
            }
            feeSummary[order.feeCurrency].totalAmount += order.amount;
            feeSummary[order.feeCurrency].totalCalculatedFee += calculatedFee;
            feeSummary[order.feeCurrency].totalExchangeFee += exchangeFeeAmount;
            feeSummary[order.feeCurrency].totalExtraFee += extraFee;
        });
        const feesComparison = Object.values(feeSummary);
        return {
            feesComparison,
        };
    }
    catch (error) {
        if (error instanceof ccxt_1.default.AuthenticationError) {
            console_1.logger.error("EXCHANGE", `Authentication error for userId: ${user.id}`, error);
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Authentication error: please check your API credentials.",
            });
        }
        else if (error instanceof ccxt_1.default.NetworkError) {
            console_1.logger.error("EXCHANGE", `Network error for userId: ${user.id}`, error);
            throw (0, error_1.createError)({
                statusCode: 503,
                message: "Network error: unable to reach the exchange.",
            });
        }
        else {
            console_1.logger.error("EXCHANGE", `An error occurred while fetching the exchange fees for userId: ${user.id}`, error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to retrieve exchange fees",
            });
        }
    }
};
