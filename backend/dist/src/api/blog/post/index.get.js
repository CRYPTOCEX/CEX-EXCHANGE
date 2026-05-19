"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List all posts",
    operationId: "listPosts",
    tags: ["Posts"],
    parameters: constants_1.crudParameters,
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
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.post,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.author,
                as: "author",
                includeModels: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "avatar"],
                        includeModels: [
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
