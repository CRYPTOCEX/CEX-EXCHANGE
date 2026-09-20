"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Lists all ecommerce categories",
    description: "Retrieves a paginated list of ecommerce categories with optional filtering and sorting. Supports search, status filtering, and custom sort fields.",
    operationId: "listEcommerceCategories",
    tags: ["Admin", "Ecommerce", "Category"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of ecommerce categories retrieved successfully with pagination metadata",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.ecommerceCategorySchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecommerce category"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ecommerce.category",
    logModule: "ADMIN_ECOM",
    logTitle: "List categories",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing query parameters");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching categories from database");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.ecommerceCategory,
        query,
        sortField: query.sortField || "name",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Categories retrieved successfully");
    return result;
};
