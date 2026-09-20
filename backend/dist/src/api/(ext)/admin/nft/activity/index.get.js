"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List all NFT marketplace activities with filtering",
    description: "Retrieves a paginated list of NFT marketplace activities including mints, transfers, sales, listings, and bids. Supports filtering by type, collection, token, creator, and search across transaction hashes and user details. Includes related token, collection, user, and listing information.",
    operationId: "getAdminNftActivity",
    tags: ["Admin", "NFT", "Activity"],
    parameters: [
        {
            name: "type",
            in: "query",
            description: "Filter by activity type (comma-separated for multiple)",
            required: false,
            schema: {
                type: "string",
            },
        },
        {
            name: "collectionId",
            in: "query",
            description: "Filter by collection ID",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "tokenId",
            in: "query",
            description: "Filter by token ID",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "creatorId",
            in: "query",
            description: "Filter by creator ID",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "search",
            in: "query",
            description: "Search by transaction hash or user details",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "NFT activity retrieved successfully",
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
                                        type: { type: "string" },
                                        tokenId: { type: "string" },
                                        collectionId: { type: "string" },
                                        listingId: { type: "string" },
                                        fromUserId: { type: "string" },
                                        toUserId: { type: "string" },
                                        price: { type: "number" },
                                        currency: { type: "string" },
                                        transactionHash: { type: "string" },
                                        blockNumber: { type: "number" },
                                        metadata: { type: "object" },
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
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Activities",
    permission: "access.nft",
    demoMask: ["items.fromUser.email", "items.toUser.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process request");
    const customWhere = {};
    if (query.type) {
        const types = query.type.split(',').map((t) => t.trim());
        if (types.length > 0) {
            customWhere.type = { [sequelize_1.Op.in]: types };
        }
    }
    if (query.collectionId) {
        customWhere[sequelize_1.Op.or] = [
            { collectionId: query.collectionId },
            { '$token.collectionId$': query.collectionId }
        ];
    }
    if (query.tokenId) {
        customWhere.tokenId = query.tokenId;
    }
    if (query.creatorId) {
        customWhere[sequelize_1.Op.or] = [
            { '$collection.creatorId$': query.creatorId },
            { '$token.collection.creatorId$': query.creatorId }
        ];
    }
    if (query.search) {
        const searchTerm = `%${query.search}%`;
        customWhere[sequelize_1.Op.or] = [
            { transactionHash: { [sequelize_1.Op.like]: searchTerm } },
            { '$fromUser.email$': { [sequelize_1.Op.like]: searchTerm } },
            { '$toUser.email$': { [sequelize_1.Op.like]: searchTerm } },
            { '$fromUser.firstName$': { [sequelize_1.Op.like]: searchTerm } },
            { '$toUser.firstName$': { [sequelize_1.Op.like]: searchTerm } },
            { '$fromUser.lastName$': { [sequelize_1.Op.like]: searchTerm } },
            { '$toUser.lastName$': { [sequelize_1.Op.like]: searchTerm } },
            { '$token.name$': { [sequelize_1.Op.like]: searchTerm } },
            { '$collection.name$': { [sequelize_1.Op.like]: searchTerm } }
        ];
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Activities retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftActivity,
        query,
        sortField: query.sortField || "createdAt",
        where: Object.keys(customWhere).length > 0 ? customWhere : undefined,
        includeModels: [
            {
                model: db_1.models.nftToken,
                as: "token",
                attributes: ["id", "name", "tokenId", "image"],
                required: false,
                includeModels: [
                    {
                        model: db_1.models.nftCollection,
                        as: "collection",
                        attributes: ["id", "name", "symbol", "logoImage", "creatorId"],
                        required: false,
                    }
                ]
            },
            {
                model: db_1.models.nftCollection,
                as: "collection",
                attributes: ["id", "name", "symbol", "logoImage", "creatorId"],
                required: false,
            },
            {
                model: db_1.models.user,
                as: "fromUser",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
                required: false,
            },
            {
                model: db_1.models.user,
                as: "toUser",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
                required: false,
            },
            {
                model: db_1.models.nftListing,
                as: "listing",
                attributes: ["id", "type", "price", "currency", "status"],
                required: false,
            },
        ],
        numericFields: ["price", "blockNumber"],
    });
};
