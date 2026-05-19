"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all tags with optional inclusion of posts",
    description: "This endpoint retrieves all available tags along with their associated posts.",
    operationId: "getTags",
    tags: ["Blog"],
    requiresAuth: false,
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
                                ...utils_1.baseTagSchema,
                                posts: utils_1.tagPostsSchema,
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
};
exports.default = async (data) => {
    const tags = await db_1.models.tag.findAll({
        include: [
            {
                model: db_1.models.post,
                as: "posts",
                through: { attributes: [] },
                where: { status: "PUBLISHED" },
                include: [
                    {
                        model: db_1.models.author,
                        as: "author",
                        include: [
                            {
                                model: db_1.models.user,
                                as: "user",
                                attributes: ["id", "firstName", "lastName", "email", "avatar"],
                            },
                        ],
                    },
                    {
                        model: db_1.models.category,
                        as: "category",
                    },
                ],
            },
        ],
    });
    return tags.map((tag) => tag.get({ plain: true }));
};
