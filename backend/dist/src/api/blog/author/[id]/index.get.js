"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const display_name_1 = require("@b/utils/display-name");
const db_1 = require("@b/db");
const public_profile_1 = require("../public-profile");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieve author with his posts",
    description: "This endpoint retrieves the public profile of an approved author along with their published posts. It answers anonymous callers — a byline is public — and returns only the published subset of the author's profile.",
    operationId: "getAuthorWithPosts",
    tags: ["Content", "Author"],
    requiresAuth: false,
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
    const author = await db_1.models.author.findOne({
        where: { id, status: "APPROVED" },
        include: [
            {
                model: db_1.models.post,
                as: "posts",
                where: { status: "PUBLISHED" },
                required: false,
                attributes: [
                    "id",
                    "title",
                    "slug",
                    "description",
                    "image",
                    "status",
                    "views",
                    "categoryId",
                    "authorId",
                    "createdAt",
                    "updatedAt",
                ],
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
                attributes: ["id", "username", "firstName", "lastName", "profile", "avatar", "lastLogin"],
            },
        ],
        order: [[{ model: db_1.models.post, as: "posts" }, "createdAt", "DESC"]],
    });
    if (!author) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Author not found",
        });
    }
    return (0, display_name_1.withPublicPresence)((0, display_name_1.redactPublicNames)((0, public_profile_1.withPublicProfile)(author.get({ plain: true }))));
};
