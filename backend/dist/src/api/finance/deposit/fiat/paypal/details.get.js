"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Fetches PayPal order details",
    description: "Retrieves details for a specific PayPal order by its ID.",
    operationId: "getPayPalOrderDetails",
    tags: ["Finance", "Deposit"],
    parameters: [
        {
            name: "orderId",
            in: "query",
            description: "PayPal order ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "PayPal order details fetched successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Order ID" },
                            status: { type: "string", description: "Order status" },
                            purchase_units: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        amount: {
                                            type: "object",
                                            properties: {
                                                currency_code: { type: "string" },
                                                value: { type: "string" },
                                            },
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
        404: (0, query_1.notFoundMetadataResponse)("Paypal"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { orderId } = query;
    if (!orderId)
        throw (0, error_1.createError)({ statusCode: 400, message: "Order ID is required" });
    const ordersController = (0, utils_1.paypalOrdersController)();
    try {
        const { result: order } = await ordersController.getOrder({
            id: orderId,
        });
        return order;
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Error getting PayPal order details: ${error.message}` });
    }
};
