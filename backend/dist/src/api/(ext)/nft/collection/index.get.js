"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const validateSortField = (sortField) => {
    const allowedSortFields = [
        'createdAt', 'updatedAt', 'name', 'totalSupply', 'status'
    ];
    if (!sortField || typeof sortField !== 'string') {
        return 'createdAt';
    }
    const cleanField = sortField.trim().toLowerCase();
    if (allowedSortFields.includes(cleanField)) {
        return cleanField;
    }
    return 'createdAt';
};
exports.metadata = {
    summary: "List NFT collections",
    operationId: "listNftCollections",
    tags: ["NFT", "Collection"],
    logModule: "NFT",
    logTitle: "Get NFT Collections",
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
                enum: ["createdAt", "name", "totalSupply", "floorPrice", "totalVolume"],
                default: "createdAt"
            },
        },
        {
            name: "sortOrder",
            in: "query",
            description: "Sort order",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
        },
        {
            name: "status",
            in: "query",
            description: "Filter by status",
            required: false,
            schema: {
                type: "string",
                enum: ["DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"]
            },
        },
        {
            name: "chain",
            in: "query",
            description: "Filter by blockchain",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "categoryId",
            in: "query",
            description: "Filter by category",
            required: false,
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "creatorId",
            in: "query",
            description: "Filter by creator",
            required: false,
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "isVerified",
            in: "query",
            description: "Filter by verification status",
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
            description: "Collections retrieved successfully",
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
                                        symbol: { type: "string" },
                                        contractAddress: { type: "string" },
                                        chain: { type: "string" },
                                        network: { type: "string" },
                                        standard: { type: "string", enum: ["ERC721", "ERC1155"] },
                                        totalSupply: { type: "integer" },
                                        maxSupply: { type: "integer" },
                                        mintPrice: { type: "number" },
                                        currency: { type: "string" },
                                        royaltyPercentage: { type: "number" },
                                        isVerified: { type: "boolean" },
                                        status: { type: "string" },
                                        logoImage: { type: "string" },
                                        bannerImage: { type: "string" },
                                        featuredImage: { type: "string" },
                                        createdAt: { type: "string", format: "date-time" },
                                        creator: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string", format: "uuid" },
                                                firstName: { type: "string" },
                                                lastName: { type: "string" },
                                                avatar: { type: "string" },
                                            },
                                        },
                                        category: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string", format: "uuid" },
                                                name: { type: "string" },
                                                slug: { type: "string" },
                                            },
                                        },
                                        stats: {
                                            type: "object",
                                            properties: {
                                                floorPrice: { type: "number" },
                                                totalVolume: { type: "number" },
                                                owners: { type: "integer" },
                                                listed: { type: "integer" },
                                            },
                                        },
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
    const where = {};
    if (query.status) {
        where.status = query.status;
    }
    else {
        where.status = "ACTIVE";
    }
    if (query.chain) {
        where.chain = query.chain;
    }
    if (query.categoryId) {
        where.categoryId = query.categoryId;
    }
    if (query.isVerified !== undefined) {
        where.isVerified = query.isVerified === "true";
    }
    if (query.search) {
        where[sequelize_1.Op.or] = [
            { name: { [sequelize_1.Op.like]: `%${query.search}%` } },
            { description: { [sequelize_1.Op.like]: `%${query.search}%` } },
        ];
    }
    return (0, query_1.getFiltered)({
        model: db_1.models.nftCollection,
        query,
        sortField: safeSortField,
        where,
        includeModels: [
            {
                model: db_1.models.nftCreator,
                as: "creator",
                attributes: ["id", "displayName", "banner", "isVerified"],
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
            {
                model: db_1.models.nftCategory,
                as: "category",
                attributes: ["id", "name", "slug"],
            },
            {
                model: db_1.models.nftToken,
                as: "tokens",
                attributes: ["id", "status"],
                required: false,
                where: { status: "MINTED" },
                include: [
                    {
                        model: db_1.models.nftSale,
                        as: "sales",
                        attributes: ["id", "price", "currency", "createdAt"],
                        required: false,
                        where: {
                            createdAt: {
                                [sequelize_1.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                            },
                            status: "COMPLETED",
                        },
                    }
                ],
                separate: true,
            },
        ],
        paranoid: query.includeDeleted !== "true",
    });
};
