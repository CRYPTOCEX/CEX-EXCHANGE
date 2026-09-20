"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a specific ecommerce product by ID",
    operationId: "getEcommerceProductById",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Fetches detailed information for a single ecommerce product including associated category details and customer reviews.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecommerce product to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Ecommerce product retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseEcommerceProductSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Product"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ecommerce.product",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching product by ID");
    const result = await (0, query_1.getRecord)("ecommerceProduct", params.id, [
        {
            model: db_1.models.ecommerceCategory,
            as: "category",
            attributes: ["name"],
        },
        {
            model: db_1.models.ecommerceReview,
            as: "ecommerceReviews",
            attributes: ["rating", "comment"],
            required: false,
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Product retrieved successfully");
    return result;
};
