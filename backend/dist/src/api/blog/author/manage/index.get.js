"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List all posts",
    operationId: "listPosts",
    tags: ["Content", "Author", "Post"],
    parameters: [...constants_1.crudParameters],
    responses: {
        200: {
            description: "Posts retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.basePostSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Posts"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { query, user, params } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    return (0, query_1.getFiltered)({
        model: db_1.models.post,
        query,
        where: { authorId: author.id },
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.category,
                as: "category",
                attributes: ["id", "name", "slug"],
            },
            {
                model: db_1.models.author,
                as: "author",
                includeModels: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "avatar"],
                    },
                ],
            },
        ],
    });
};
