"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all categories with pagination and optional filtering",
    operationId: "listCategories",
    tags: ["Admin", "Content", "Category"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of categories with optional related posts and pagination",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.categorySchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Categories"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.blog.category",
    logModule: "ADMIN_BLOG",
    logTitle: "List categories",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing query parameters");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching categories with filters");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.category,
        query,
        sortField: query.sortField || "name",
        includeModels: [
            {
                model: db_1.models.post,
                as: "posts",
                attributes: ["id", "title", "createdAt"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Categories retrieved successfully");
    return result;
};
