"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific ecommerce shipping by ID",
    operationId: "getEcommerceShippingById",
    tags: ["Admin", "Ecommerce Shipping"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecommerce shipping to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Ecommerce shipping details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.ecommerceShippingSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Shipping"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ecommerce.shipping",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching shipping by ID");
    const result = await (0, query_1.getRecord)("ecommerceShipping", params.id, [
        {
            model: db_1.models.ecommerceOrder,
            as: "ecommerceOrders",
            includeModels: [
                {
                    model: db_1.models.ecommerceOrderItem,
                    as: "ecommerceOrderItems",
                    attributes: ["orderId", "productId", "quantity"],
                },
            ],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Shipping retrieved successfully");
    return result;
};
