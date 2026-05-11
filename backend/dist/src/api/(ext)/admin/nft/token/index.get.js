"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "List NFT tokens for admin management",
    operationId: "listAdminNftTokens",
    tags: ["Admin", "NFT", "Tokens"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Tokens",
    parameters: [
        {
            name: "page",
            in: "query",
            description: "Page number",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 }
        },
        {
            name: "perPage",
            in: "query",
            description: "Items per page",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 }
        },
        {
            name: "sortField",
            in: "query",
            description: "Field to sort by",
            required: false,
            schema: { type: "string", default: "createdAt" }
        },
        {
            name: "sortOrder",
            in: "query",
            description: "Sort order",
            required: false,
            schema: { type: "string", enum: ["ASC", "DESC"], default: "DESC" }
        },
        {
            name: "search",
            in: "query",
            description: "Search term",
            required: false,
            schema: { type: "string" }
        },
        {
            name: "status",
            in: "query",
            description: "Filter by status",
            required: false,
            schema: { type: "string", enum: ["DRAFT", "MINTED", "BURNED"] }
        },
        {
            name: "rarity",
            in: "query",
            description: "Filter by rarity",
            required: false,
            schema: { type: "string", enum: ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] }
        },
        {
            name: "isMinted",
            in: "query",
            description: "Filter by minting status",
            required: false,
            schema: { type: "boolean" }
        },
        {
            name: "isListed",
            in: "query",
            description: "Filter by listing status",
            required: false,
            schema: { type: "boolean" }
        },
        {
            name: "collectionId",
            in: "query",
            description: "Filter by collection",
            required: false,
            schema: { type: "string" }
        }
    ],
    responses: {
        200: {
            description: "NFT tokens retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/NftToken" }
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    page: { type: "integer" },
                                    perPage: { type: "integer" },
                                    totalItems: { type: "integer" },
                                    totalPages: { type: "integer" }
                                }
                            }
                        }
                    }
                }
            }
        },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.token",
    demoMask: ["items.owner.email", "items.creator.user.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT tokens");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftToken,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.nftCollection,
                as: "collection",
                attributes: ["id", "name", "symbol", "chain", "logoImage", "isVerified"],
            },
            {
                model: db_1.models.user,
                as: "owner",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.nftCreator,
                as: "creator",
                attributes: ["id", "userId", "displayName", "isVerified", "verificationTier"],
                includeModels: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "avatar"],
                    }
                ]
            }
        ],
        numericFields: ["views", "likes", "rarityScore"],
        customFilterHandler: (filters) => {
            const whereClause = {};
            if (query.status) {
                whereClause.status = query.status;
            }
            if (query.rarity) {
                whereClause.rarity = query.rarity;
            }
            if (query.isListed !== undefined) {
                whereClause.isListed = query.isListed === 'true';
            }
            if (query.collectionId) {
                whereClause.collectionId = query.collectionId;
            }
            if (query.ownerId) {
                whereClause.ownerId = query.ownerId;
            }
            if (query.creatorId) {
                whereClause.creatorId = query.creatorId;
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT tokens retrieved successfully");
            return whereClause;
        }
    });
};
