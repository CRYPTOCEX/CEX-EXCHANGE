"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List all authors",
    operationId: "listAuthors",
    tags: ["Admin", "Content", "Author"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Authors retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseAuthorSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Authors"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.blog.author",
    demoMask: ["items.user.email"],
    logModule: "ADMIN_BLOG",
    logTitle: "List authors",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing query parameters");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching authors with filters");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.author,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Authors retrieved successfully");
    return result;
};
