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
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
exports.metadata = {
    summary: "List Orders",
    operationId: "listOrders",
    tags: ["Exchange", "Orders"],
    description: "Retrieves a list of orders for the authenticated user.",
    logModule: "ECOSYSTEM",
    logTitle: "List user orders",
    parameters: [
        {
            name: "type",
            in: "query",
            description: "Type of order to retrieve.",
            schema: { type: "string" },
        },
        {
            name: "symbol",
            in: "query",
            description: "Symbol of the order to retrieve.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "A list of orders",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseOrderSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { currency, pair, type } = query;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const safeParam = /^[a-zA-Z0-9._-]{1,20}$/;
    if (currency && !safeParam.test(currency))
        throw (0, error_1.createError)(400, "Invalid currency");
    if (pair && !safeParam.test(pair))
        throw (0, error_1.createError)(400, "Invalid pair");
    if (type && !["OPEN", "CLOSED", "CANCELLED"].includes(type))
        throw (0, error_1.createError)(400, "Invalid order type");
    if (!currency || !pair) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all user orders");
        const { getOrdersByUserId } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
        try {
            const orders = await getOrdersByUserId(user.id);
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Filtering orders by status: ${type || 'all'}`);
            const filteredOrders = orders.filter((order) => type === "OPEN" ? order.status === "OPEN" : order.status !== "OPEN");
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Converting bigint fields to numbers");
            const result = filteredOrders.map((order) => {
                const { fromBigInt } = require("@b/api/(ext)/ecosystem/utils/blockchain");
                return {
                    ...order,
                    amount: fromBigInt(order.amount),
                    price: fromBigInt(order.price),
                    cost: fromBigInt(order.cost),
                    fee: fromBigInt(order.fee),
                    filled: fromBigInt(order.filled),
                    remaining: fromBigInt(order.remaining),
                };
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${result.length} orders`);
            return result;
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to fetch orders: ${error.message}`);
            console.error(`[Ecosystem Orders] Error fetching orders:`, error);
            throw error;
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching orders for ${currency}/${pair}`);
    const result = await (0, queries_1.getOrders)(user.id, `${currency}/${pair}`, type === "OPEN");
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${(result === null || result === void 0 ? void 0 : result.length) || 0} orders for ${currency}/${pair}`);
    return result;
};
