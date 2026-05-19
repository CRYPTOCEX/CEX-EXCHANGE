"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List NFT collections",
    operationId: "listAdminNftCollections",
    tags: ["Admin", "NFT", "Collection"],
    description: "Retrieve a paginated list of NFT collections with filtering and sorting options. Includes creator and category information for each collection.",
    logModule: "ADMIN_NFT",
    logTitle: "List NFT collections",
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
            description: "Search term to filter collections by name, symbol, or description",
            required: false,
            schema: { type: "string" }
        },
        {
            name: "status",
            in: "query",
            description: "Filter by collection status",
            required: false,
            schema: { type: "string", enum: ["DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"] }
        },
        {
            name: "chain",
            in: "query",
            description: "Filter by blockchain network",
            required: false,
            schema: { type: "string", enum: ["ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM"] }
        },
        {
            name: "isVerified",
            in: "query",
            description: "Filter by verification status",
            required: false,
            schema: { type: "boolean" }
        }
    ],
    responses: {
        200: (0, errors_1.paginatedResponse)({
            type: "object",
            properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                slug: { type: "string" },
                description: { type: "string" },
                symbol: { type: "string" },
                contractAddress: { type: "string", nullable: true },
                chain: { type: "string" },
                network: { type: "string" },
                standard: { type: "string", enum: ["ERC721", "ERC1155"] },
                totalSupply: { type: "integer" },
                maxSupply: { type: "integer", nullable: true },
                mintPrice: { type: "number", nullable: true },
                currency: { type: "string" },
                royaltyPercentage: { type: "number" },
                royaltyAddress: { type: "string", nullable: true },
                isVerified: { type: "boolean" },
                isLazyMinted: { type: "boolean" },
                status: { type: "string", enum: ["DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"] },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                creator: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        userId: { type: "string", format: "uuid" },
                        displayName: { type: "string" },
                        isVerified: { type: "boolean" },
                        user: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                avatar: { type: "string", nullable: true }
                            }
                        }
                    }
                },
                category: {
                    type: "object",
                    nullable: true,
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" }
                    }
                }
            }
        }, "NFT collections retrieved successfully"),
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse
    },
    requiresAuth: true,
    permission: "access.nft.collection"
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT collections");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftCollection,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.nftCreator,
                as: "creator",
                attributes: ["id", "userId", "displayName", "isVerified"],
                includeModels: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    }
                ]
            },
            {
                model: db_1.models.nftCategory,
                as: "category",
                attributes: ["id", "name"],
            }
        ],
        numericFields: ["totalSupply", "royaltyPercentage"],
        customFilterHandler: (filters) => {
            const whereClause = {};
            if (query.status) {
                whereClause.status = query.status;
            }
            if (query.chain) {
                whereClause.chain = query.chain;
            }
            if (query.isVerified !== undefined) {
                whereClause.isVerified = query.isVerified === 'true';
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT collections retrieved successfully");
            return whereClause;
        }
    });
};
