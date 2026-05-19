"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List user's NFT collections for selection",
    operationId: "listUserNftCollectionsForSelection",
    tags: ["NFT", "Collection"],
    logModule: "NFT",
    logTitle: "Get Collection List",
    description: "Returns a simple array of user's collections suitable for dropdowns/selection",
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by status (defaults to ACTIVE only)",
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
    ],
    responses: {
        200: {
            description: "Collections retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string" },
                                symbol: { type: "string" },
                                chain: { type: "string" },
                                network: { type: "string" },
                                standard: { type: "string", enum: ["ERC721", "ERC1155"] },
                                logoImage: { type: "string" },
                                contractAddress: { type: "string" },
                                status: { type: "string" },
                                mintPrice: { type: "number" },
                                maxSupply: { type: "integer" },
                                totalSupply: { type: "integer" },
                                category: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string", format: "uuid" },
                                        name: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    }
    try {
        let creator = await db_1.models.nftCreator.findOne({
            where: { userId: user.id }
        });
        if (!creator) {
            const creatorUsername = user.firstName
                ? `${user.firstName}${user.lastName || ''}`.toLowerCase().replace(/\s+/g, '')
                : `creator_${user.id.slice(0, 8)}`;
            creator = await db_1.models.nftCreator.create({
                userId: user.id,
                isVerified: false,
                profilePublic: true,
                totalVolume: 0,
                totalSales: 0,
                totalItems: 0,
                floorPrice: 0
            });
        }
        const where = {
            creatorId: creator.id,
        };
        if (query.status) {
            where.status = query.status;
        }
        else {
            where.status = ['ACTIVE', 'PENDING'];
        }
        if (query.chain) {
            where.chain = query.chain;
        }
        const collections = await db_1.models.nftCollection.findAll({
            where,
            attributes: [
                'id',
                'name',
                'symbol',
                'chain',
                'network',
                'standard',
                'logoImage',
                'contractAddress',
                'status',
                'mintPrice',
                'maxSupply',
                'totalSupply'
            ],
            include: [
                {
                    model: db_1.models.nftCategory,
                    as: 'category',
                    attributes: ['id', 'name'],
                    required: false,
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Collection List completed successfully");
        return collections;
    }
    catch (error) {
        console_1.logger.error("NFT", "Error fetching collections for selection", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to retrieve collections" });
    }
};
