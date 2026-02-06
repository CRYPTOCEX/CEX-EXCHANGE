"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getAuthors = getAuthors;
const db_1 = require("@b/db");
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Lists all authors based on status and posts",
    description: "This endpoint retrieves all available authors based on their status and optionally includes their posts.",
    operationId: "getAuthors",
    tags: ["Content", "Author"],
    requiresAuth: false,
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter authors by status",
            required: false,
            schema: {
                type: "string",
                enum: ["PENDING", "APPROVED", "REJECTED"],
            },
        },
        {
            name: "posts",
            in: "query",
            description: "Include posts for each author",
            required: false,
            schema: {
                type: "boolean",
            },
        },
    ],
    responses: {
        200: {
            description: "Authors retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: utils_1.baseAuthorSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Author"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { query } = data;
    return getAuthors(query.posts === "true", query.status);
};
async function getAuthors(includePosts, status) {
    const includes = [
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar", "profile"],
        },
    ];
    if (includePosts) {
        includes.push({
            model: db_1.models.post,
            as: "post",
        });
    }
    const where = {};
    if (status) {
        where["status"] = status;
    }
    const authors = await db_1.models.author.findAll({
        where: where,
        include: includes,
    });
    return authors.map((author) => author.get({ plain: true }));
}
