"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List all NFT categories with filtering",
    description: "Retrieves a paginated list of NFT categories. Supports filtering by status and searching by name. Categories are used to organize NFT collections into logical groups (e.g., Art, Gaming, Music).",
    operationId: "getAdminNftCategories",
    tags: ["Admin", "NFT", "Category"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Categories",
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by status",
            required: false,
            schema: { type: "boolean" },
        },
        {
            name: "search",
            in: "query",
            description: "Search by name",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "NFT categories retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        name: { type: "string" },
                                        slug: { type: "string" },
                                        description: { type: "string" },
                                        image: { type: "string" },
                                        status: { type: "boolean" },
                                        createdAt: { type: "string" },
                                    },
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    page: { type: "number" },
                                    pageSize: { type: "number" },
                                    totalItems: { type: "number" },
                                    totalPages: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.nft",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT categories");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT categories retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftCategory,
        query,
        sortField: query.sortField || "createdAt",
    });
};
