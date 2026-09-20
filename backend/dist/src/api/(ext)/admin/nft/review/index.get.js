"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get NFT reviews (Admin)",
    operationId: "getAdminNftReviews",
    tags: ["Admin", "NFT", "Review"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Reviews",
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by status",
            required: false,
            schema: {
                type: "string",
                enum: ["PENDING", "APPROVED", "REJECTED", "HIDDEN"],
            },
        },
        {
            name: "tokenId",
            in: "query",
            description: "Filter by token ID",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "collectionId",
            in: "query",
            description: "Filter by collection ID",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "userId",
            in: "query",
            description: "Filter by user ID",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "rating",
            in: "query",
            description: "Filter by rating",
            required: false,
            schema: { type: "number", minimum: 1, maximum: 5 },
        },
        {
            name: "isVerified",
            in: "query",
            description: "Filter by verification status",
            required: false,
            schema: { type: "boolean" },
        },
    ],
    responses: {
        200: {
            description: "NFT reviews retrieved successfully",
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
                                        id: { type: "string" },
                                        userId: { type: "string" },
                                        tokenId: { type: "string" },
                                        collectionId: { type: "string" },
                                        creatorId: { type: "string" },
                                        rating: { type: "number" },
                                        title: { type: "string" },
                                        comment: { type: "string" },
                                        isVerified: { type: "boolean" },
                                        helpfulCount: { type: "number" },
                                        status: { type: "string" },
                                        createdAt: { type: "string" },
                                        user: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                firstName: { type: "string" },
                                                lastName: { type: "string" },
                                                email: { type: "string" },
                                            },
                                        },
                                        token: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                name: { type: "string" },
                                                image: { type: "string" },
                                            },
                                        },
                                        collection: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                name: { type: "string" },
                                                symbol: { type: "string" },
                                            },
                                        },
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
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "access.nft",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT reviews");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT reviews retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftReview,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.nftToken,
                as: "token",
                attributes: ["id", "name", "image"],
            },
            {
                model: db_1.models.nftCollection,
                as: "collection",
                attributes: ["id", "name", "symbol"],
            },
        ],
    });
};
