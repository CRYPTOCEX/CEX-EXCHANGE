"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists content reports",
    description: "Complaints filed by users about comments, posts, listings and profiles. Separate from P2P user reports, which are about a person and may carry a trade.",
    operationId: "listContentReports",
    tags: ["Admin", "Moderation", "Report"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of content reports",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { type: "object" } },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Content Reports"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.blog.comment",
    logModule: "ADMIN_BLOG",
    logTitle: "List content reports",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.contentReport,
        query,
        sortField: query.sortField || "createdAt",
        timestamps: true,
        includeModels: [
            {
                model: db_1.models.user,
                as: "reporter",
                attributes: ["id", "username", "firstName", "lastName", "avatar"],
            },
            {
                model: db_1.models.user,
                as: "targetOwner",
                attributes: ["id", "username", "firstName", "lastName", "avatar"],
                required: false,
            },
            {
                model: db_1.models.user,
                as: "reviewedBy",
                attributes: ["id", "username", "firstName", "lastName"],
                required: false,
            },
        ],
    });
};
