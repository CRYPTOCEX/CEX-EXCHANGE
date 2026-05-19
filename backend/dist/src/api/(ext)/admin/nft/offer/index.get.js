"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List all NFT offers with filtering and pagination",
    operationId: "listNftOffers",
    tags: ["Admin", "NFT", "Offer"],
    description: "Retrieve a paginated list of NFT offers with optional filtering by status, type, and search term. Returns offers with associated token and user information.",
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Offers",
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by offer status",
            required: false,
            schema: {
                type: "string",
                enum: ["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
            },
        },
        {
            name: "type",
            in: "query",
            description: "Filter by offer type",
            required: false,
            schema: {
                type: "string",
                enum: ["TOKEN", "COLLECTION"],
            },
        },
        {
            name: "search",
            in: "query",
            description: "Search by token name or user email",
            required: false,
            schema: { type: "string" },
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
                enum: ["createdAt", "amount", "expiresAt", "status"],
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
                tokenId: { type: "string", format: "uuid", nullable: true },
                collectionId: { type: "string", format: "uuid", nullable: true },
                listingId: { type: "string", format: "uuid", nullable: true },
                userId: { type: "string", format: "uuid" },
                amount: { type: "number" },
                currency: { type: "string" },
                status: {
                    type: "string",
                    enum: ["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
                },
                type: {
                    type: "string",
                    enum: ["TOKEN", "COLLECTION"],
                    nullable: true,
                },
                message: { type: "string", nullable: true },
                expiresAt: { type: "string", format: "date-time", nullable: true },
                acceptedAt: { type: "string", format: "date-time", nullable: true },
                rejectedAt: { type: "string", format: "date-time", nullable: true },
                cancelledAt: { type: "string", format: "date-time", nullable: true },
                expiredAt: { type: "string", format: "date-time", nullable: true },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                token: {
                    type: "object",
                    nullable: true,
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        image: { type: "string", nullable: true },
                        tokenId: { type: "string" },
                    },
                },
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
        }, "NFT offers retrieved successfully"),
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.nft",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT offers");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT offers retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftOffer,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.nftToken,
                as: "token",
                attributes: ["id", "name", "image", "tokenId"],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            }
        ],
    });
};
