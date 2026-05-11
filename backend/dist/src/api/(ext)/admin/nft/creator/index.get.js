"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List all NFT creators with filtering and pagination",
    operationId: "listNftCreators",
    tags: ["Admin", "NFT", "Creator"],
    description: "Retrieve a paginated list of NFT creators with optional filtering by verification status and search term. Returns creator profiles including statistics like total sales, volume, and items.",
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Creators",
    parameters: [
        {
            name: "search",
            in: "query",
            description: "Search by creator display name or user details",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "isVerified",
            in: "query",
            description: "Filter by verification status (true/false)",
            required: false,
            schema: { type: "boolean" },
        },
        {
            name: "verificationTier",
            in: "query",
            description: "Filter by verification tier",
            required: false,
            schema: {
                type: "string",
                enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
            },
        },
        {
            name: "page",
            in: "query",
            description: "Page number for pagination",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
        },
        {
            name: "perPage",
            in: "query",
            description: "Number of items per page",
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
                enum: [
                    "createdAt",
                    "displayName",
                    "totalSales",
                    "totalVolume",
                    "totalItems",
                ],
                default: "createdAt",
            },
        },
        {
            name: "sortOrder",
            in: "query",
            description: "Sort order",
            required: false,
            schema: { type: "string", enum: ["ASC", "DESC"], default: "DESC" },
        },
    ],
    responses: {
        200: (0, errors_1.paginatedResponse)({
            type: "object",
            properties: {
                id: { type: "string", format: "uuid" },
                userId: { type: "string", format: "uuid" },
                displayName: { type: "string", nullable: true },
                bio: { type: "string", nullable: true },
                banner: { type: "string", nullable: true },
                isVerified: { type: "boolean" },
                verificationTier: {
                    type: "string",
                    enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
                    nullable: true,
                },
                totalSales: { type: "integer" },
                totalVolume: { type: "number" },
                totalItems: { type: "integer" },
                floorPrice: { type: "number", nullable: true },
                profilePublic: { type: "boolean" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                user: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        firstName: { type: "string", nullable: true },
                        lastName: { type: "string", nullable: true },
                        email: { type: "string" },
                        avatar: { type: "string", nullable: true },
                    },
                },
            },
        }, "NFT creators retrieved successfully"),
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.nft",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT creators");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT creators retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftCreator,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
        numericFields: ["totalSales", "totalVolume", "totalItems", "floorPrice"],
    });
};
