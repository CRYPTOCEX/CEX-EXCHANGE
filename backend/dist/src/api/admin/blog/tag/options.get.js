"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a list of tags",
    description: "This endpoint retrieves all available tags for the blog post editor.",
    operationId: "getTagOptions",
    tags: ["Tag"],
    requiresAuth: true,
    permission: "view.blog.tag",
    responses: {
        200: {
            description: "Tags retrieved successfully",
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
        404: (0, query_1.notFoundMetadataResponse)("Tag"),
        500: query_1.serverErrorResponse,
    },
    logModule: "ADMIN_BLOG",
    logTitle: "Get tag options",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all tags");
    const tags = await db_1.models.tag.findAll({
        attributes: ["id", "name", "slug"],
        order: [["name", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${tags.length} tag options retrieved`);
    return tags.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug }));
};
