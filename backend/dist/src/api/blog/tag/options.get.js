"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Lists every tag, for the author post editor",
    description: "Flat list of tags used to suggest existing tags while writing a post. " +
        "This is deliberately NOT `GET /api/blog/tag`: that endpoint inner-joins " +
        "posts with `status: PUBLISHED`, so a tag whose posts are all drafts — or " +
        "a tag that was just created — is missing from it entirely, which is " +
        "exactly the set an author is most likely to reach for.",
    operationId: "getAuthorTagOptions",
    tags: ["Blog", "Tag"],
    requiresAuth: true,
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
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const tags = await db_1.models.tag.findAll({
        attributes: ["id", "name", "slug"],
        order: [["name", "ASC"]],
    });
    return tags.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug }));
};
