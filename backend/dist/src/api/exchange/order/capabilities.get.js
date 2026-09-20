"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const time_in_force_1 = require("./util/time-in-force");
exports.metadata = {
    summary: "Order capabilities of the connected exchange provider",
    operationId: "getExchangeOrderCapabilities",
    tags: ["Exchange", "Orders"],
    description: "Which time-in-force values the currently connected provider can honour. Values absent from `timeInForce.limit` are refused by POST /api/exchange/order rather than silently degraded.",
    responses: {
        200: {
            description: "Order capabilities",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            timeInForce: {
                                type: "object",
                                properties: {
                                    limit: {
                                        type: "array",
                                        description: "Values accepted on a LIMIT order. Always contains GTC.",
                                        items: { type: "string", enum: [...time_in_force_1.TIME_IN_FORCE_VALUES] },
                                    },
                                    market: {
                                        type: "array",
                                        description: "Values accepted on a MARKET order. A market order never rests, so no venue on this path is asked for one.",
                                        items: { type: "string", enum: [...time_in_force_1.TIME_IN_FORCE_VALUES] },
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
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const provider = await exchange_1.default.getProvider();
    return {
        timeInForce: {
            limit: (0, time_in_force_1.timeInForceForProvider)(provider),
            market: [],
        },
    };
};
