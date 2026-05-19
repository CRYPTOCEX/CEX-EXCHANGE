"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieve author with his posts",
    description: "This endpoint retrieves the author profile associated with a given user id along with the posts linked to that profile.",
    operationId: "getAuthorWithPosts",
    tags: ["Content", "Author"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Author and posts retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            author: {
                                type: "object",
                            },
                            posts: {
                                type: "array",
                                items: {
                                    type: "object",
                                },
                            },
                        },
                    },
                },
            },
        },
        404: (0, query_1.notFoundMetadataResponse)("Author"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { query, user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Missing userId parameter",
        });
    }
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
        include: [
            {
                model: db_1.models.post,
                as: "posts",
                include: [
                    {
                        model: db_1.models.category,
                        as: "category",
                    },
                ],
            },
        ],
    });
    if (!author) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Author not found",
        });
    }
    return author;
};
