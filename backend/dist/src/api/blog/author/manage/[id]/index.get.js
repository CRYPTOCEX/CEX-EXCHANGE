"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Retrieves a single blog post by ID",
    description: "This endpoint retrieves a single blog post by its ID.",
    operationId: "getPostById",
    tags: ["Content", "Author", "Post"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the blog post to retrieve",
            required: true,
            schema: {
                type: "string",
                description: "Post ID",
            },
        },
    ],
    responses: {
        200: {
            description: "Blog post retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "boolean",
                                description: "Indicates if the request was successful",
                            },
                            statusCode: {
                                type: "number",
                                description: "HTTP status code",
                                example: 200,
                            },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    title: { type: "string" },
                                    content: { type: "string" },
                                    categoryId: { type: "string" },
                                    authorId: { type: "string" },
                                    slug: { type: "string" },
                                    description: { type: "string", nullable: true },
                                    status: {
                                        type: "string",
                                        enum: ["PUBLISHED", "DRAFT", "TRASH"],
                                    },
                                    image: { type: "string", nullable: true },
                                    createdAt: { type: "string", format: "date-time" },
                                    updatedAt: {
                                        type: "string",
                                        format: "date-time",
                                        nullable: true,
                                    },
                                    author: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            userId: { type: "string" },
                                        },
                                    },
                                    category: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            slug: { type: "string" },
                                        },
                                    },
                                    postTag: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                postId: { type: "string" },
                                                tagId: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        404: {
            description: "Blog post not found",
        },
        500: {
            description: "Internal server error",
        },
    },
};
exports.default = async (data) => {
    const { user, params } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    const { id } = params;
    return await db_1.models.post.findOne({
        where: { id, authorId: author.id },
        include: [
            {
                model: db_1.models.author,
                as: "author",
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "avatar"],
                        include: [
                            {
                                model: db_1.models.role,
                                as: "role",
                                attributes: ["name"],
                            },
                        ],
                    },
                ],
            },
            {
                model: db_1.models.category,
                as: "category",
            },
            {
                model: db_1.models.tag,
                as: "tags",
                through: {
                    attributes: [],
                },
            },
        ],
    });
};
