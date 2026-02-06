"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Lists all comments for a given post along with optional inclusion of posts",
    description: "This endpoint retrieves all comments for the specified post along with their associated posts.",
    operationId: "getPostComments",
    tags: ["Blog"],
    requiresAuth: false,
    parameters: [
        {
            index: 0,
            name: "postId",
            in: "path",
            description: "The ID of the post",
            required: true,
            schema: {
                type: "string",
                description: "Post ID",
            },
        },
    ],
    responses: {
        200: {
            description: "Comments retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ...utils_1.baseCommentSchema,
                                posts: utils_1.commentPostsSchema,
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Comments"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { postId } = data.params;
    const comments = await db_1.models.comment.findAll({
        where: { postId },
        include: {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
    });
    return comments.map((comment) => comment.get({ plain: true }));
};
