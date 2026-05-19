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
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Retrieves the exchange balance for the logged-in user",
    description: "Fetches the exchange balance associated with the currently authenticated user.",
    operationId: "getExchangeBalance",
    tags: ["Admin", "Exchange", "Balance"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Exchange balance retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                asset: {
                                    type: "string",
                                    description: "The asset symbol",
                                },
                                available: {
                                    type: "number",
                                    description: "The available balance",
                                },
                                inOrder: {
                                    type: "number",
                                    description: "The balance locked in orders",
                                },
                                total: {
                                    type: "number",
                                    description: "The total balance",
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
    permission: "view.exchange.balance",
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
        const balance = await exchange.fetchBalance();
        const structuredBalance = Object.entries(balance.total)
            .map(([asset, total]) => ({
            asset,
            available: balance.free[asset] || 0,
            inOrder: balance.used[asset] || 0,
            total,
        }))
            .filter((balance) => balance.available > 0 || balance.inOrder > 0);
        return {
            balance: structuredBalance,
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
            console_1.logger.error("EXCHANGE", `An error occurred while fetching the exchange balance for userId: ${user.id}`, error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to retrieve exchange balance",
            });
        }
    }
};
