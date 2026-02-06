"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all ecommerce Shipping with pagination and optional filtering",
    operationId: "listEcommerceShipping",
    tags: ["Admin", "Ecommerce", "Shipping"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of ecommerce Shipping with details about shipping items",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.ecommerceShippingSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("E-commerce Shipping"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecommerce.shipping",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching shipping options list");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.ecommerceShipping,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
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
        ],
        numericFields: ["cost", "weight", "volume", "tax"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} shipping options`);
    return result;
};
