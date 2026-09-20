"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Lists every category, for the author post editor",
    description: "Flat list of categories used to fill the Category selector while writing " +
        "a post. This is deliberately NOT `GET /api/blog/category`: that endpoint " +
        "inner-joins posts with `status: PUBLISHED`, so a category whose posts " +
        "are all drafts — or a category the operator has only just created — is " +
        "missing from it entirely. Since a category cannot be picked until it " +
        "already holds a published post, and cannot hold one until it has been " +
        "picked, feeding an authoring selector from the browse endpoint locks a " +
        "new category out permanently. Same reasoning as " +
        "`/api/blog/tag/options`.",
    operationId: "getAuthorCategoryOptions",
    tags: ["Blog", "Category"],
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
                                slug: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const categories = await db_1.models.category.findAll({
        attributes: ["id", "name", "slug"],
        order: [["name", "ASC"]],
    });
    return categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
    }));
};
