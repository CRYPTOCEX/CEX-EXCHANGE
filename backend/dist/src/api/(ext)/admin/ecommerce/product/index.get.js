"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all ecommerce products with pagination and filtering",
    operationId: "listEcommerceProducts",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Retrieves a paginated list of ecommerce products with optional filtering and sorting. Includes associated category information and reviews for each product.",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Ecommerce products retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.ecommerceProductSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Products"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecommerce.product",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching products list");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.ecommerceProduct,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
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
        ],
        numericFields: ["price", "inventoryQuantity", "rating"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} products`);
    return result;
};
