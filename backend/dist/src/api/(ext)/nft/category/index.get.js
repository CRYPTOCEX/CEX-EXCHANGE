"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const validateSortField = (sortField) => {
    const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'status', 'collectionsCount'];
    if (!sortField || typeof sortField !== 'string') {
        return 'name';
    }
    const cleanField = sortField.trim().toLowerCase();
    if (allowedSortFields.includes(cleanField)) {
        return cleanField;
    }
    return 'name';
};
exports.metadata = {
    summary: "List NFT categories",
    operationId: "listNftCategories",
    tags: ["NFT", "Category"],
    logModule: "NFT",
    logTitle: "Get NFT Categories",
    parameters: [
        {
            name: "page",
            in: "query",
            description: "Page number",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
        },
        {
            name: "perPage",
            in: "query",
            description: "Items per page",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
        },
        {
            name: "sortField",
            in: "query",
            description: "Field to sort by",
            required: false,
            schema: {
                type: "string",
                enum: ["createdAt", "name"],
                default: "name"
            },
        },
        {
            name: "sortOrder",
            in: "query",
            description: "Sort order",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
        },
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
            description: "Search in name and description",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Categories retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string", format: "uuid" },
                                        name: { type: "string" },
                                        slug: { type: "string" },
                                        description: { type: "string" },
                                        image: { type: "string" },
                                        status: { type: "boolean" },
                                        createdAt: { type: "string", format: "date-time" },
                                        collectionsCount: { type: "integer" },
                                    },
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    page: { type: "integer" },
                                    perPage: { type: "integer" },
                                    totalItems: { type: "integer" },
                                    totalPages: { type: "integer" },
                                },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { query, ctx } = data;
    const safeSortField = validateSortField(query.sortField);
    return (0, query_1.getFiltered)({
        model: db_1.models.nftCategory,
        query,
        sortField: safeSortField,
        paranoid: query.includeDeleted !== "true",
    });
};
