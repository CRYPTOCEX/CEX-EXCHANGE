"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
const order_1 = require("@b/api/(ext)/futures/utils/queries/order");
exports.metadata = {
    summary: "List Futures Orders",
    operationId: "listFuturesOrders",
    tags: ["Futures", "Orders"],
    logModule: "FUTURES",
    logTitle: "List futures orders",
    description: "Retrieves a list of futures orders for the authenticated user.",
    parameters: [
        {
            name: "currency",
            in: "query",
            description: "Currency of the orders to retrieve.",
            schema: { type: "string" },
        },
        {
            name: "pair",
            in: "query",
            description: "Pair of the orders to retrieve.",
            schema: { type: "string" },
        },
        {
            name: "type",
            in: "query",
            description: "Type of order to retrieve.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "A list of futures orders",
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
    var _a, _b, _c, _d;
    const { user, query, ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency, pair, type } = query;
    const symbol = currency && pair ? `${currency}/${pair}` : undefined;
    const isOpen = type === "OPEN";
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Fetching futures orders${symbol ? ` for ${symbol}` : ""}${type ? ` (${type})` : ""}`);
    const orders = await (0, order_1.getOrders)(user.id, symbol, isOpen);
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Retrieved ${orders.length} futures orders`);
    return orders;
};
