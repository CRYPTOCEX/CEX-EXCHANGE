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
    parameters: [
        {
            in: "path",
            name: "id",
            required: true,
            schema: {
                type: "string",
            },
            description: "Author ID",
        },
    ],
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
    const { params } = data;
    const { id } = params;
    const author = await db_1.models.author.findByPk(id, {
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
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "profile", "avatar"],
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
