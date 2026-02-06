"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific category by ID",
    operationId: "getCategoryById",
    tags: ["Admin", "Content", "Category"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the category to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Category details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseCategorySchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Category"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.blog.category",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Get category by ID",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching category");
    const result = await (0, query_1.getRecord)("category", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Category retrieved successfully");
    return result;
};
