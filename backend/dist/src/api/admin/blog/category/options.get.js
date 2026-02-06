"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a list of categories",
    description: "This endpoint retrieves all available categories for posts.",
    operationId: "getCategories",
    tags: ["Category"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Categories retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Category"),
        500: query_1.serverErrorResponse,
    },
    logModule: "ADMIN_BLOG",
    logTitle: "Get category options",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all categories");
        const categories = await db_1.models.category.findAll();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Formatting category options");
        const formatted = categories.map((category) => ({
            id: category.id,
            name: category.name,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`${formatted.length} category options retrieved`);
        return formatted;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch categories");
        throw (0, error_1.createError)(500, "An error occurred while fetching categories");
    }
};
