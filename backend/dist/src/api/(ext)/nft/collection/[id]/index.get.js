"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get NFT collection by ID",
    operationId: "getNftCollection",
    tags: ["NFT", "Collection"],
    logModule: "NFT",
    logTitle: "Get NFT Collection",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Collection ID (UUID) or slug",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Collection retrieved successfully",
            content: {
                "application/json": {
                    schema: {
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
                            royaltyAddress: { type: "string" },
                            isVerified: { type: "boolean" },
                            status: { type: "string" },
                            logoImage: { type: "string" },
                            bannerImage: { type: "string" },
                            featuredImage: { type: "string" },
                            website: { type: "string" },
                            discord: { type: "string" },
                            twitter: { type: "string" },
                            telegram: { type: "string" },
                            createdAt: { type: "string", format: "date-time" },
                            updatedAt: { type: "string", format: "date-time" },
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
                                    tokenCount: { type: "integer" },
                                    ownersCount: { type: "integer" },
                                    floorPrice: { type: "number" },
                                    totalVolume: { type: "number" },
                                    listedCount: { type: "integer" },
                                },
                            },
                        },
                    },
                },
            },
        },
        404: { description: "Collection not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const collection = await db_1.models.nftCollection.findOne({
            where: isUUID ? { id } : { slug: id },
            include: [
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
            ],
        });
        if (!collection) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Collection not found" });
        }
        const collectionId = collection.id;
        const tokenCount = await db_1.models.nftToken.count({
            where: {
                collectionId,
                status: {
                    [sequelize_1.Op.in]: ["MINTED", "LISTED", "SOLD"],
                },
            },
        });
        const tokens = await db_1.models.nftToken.findAll({
            where: {
                collectionId,
                status: {
                    [sequelize_1.Op.in]: ["MINTED", "LISTED", "SOLD"],
                },
            },
            attributes: ["ownerId"],
            raw: true,
        });
        const ownersCount = new Set(tokens.map((t) => t.ownerId)).size;
        const floorListing = await db_1.models.nftListing.findOne({
            where: {
                status: "ACTIVE",
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    required: true,
                    where: {
                        collectionId,
                    },
                },
            ],
            order: [["price", "ASC"]],
        });
        const sales = await db_1.models.nftSale.findAll({
            where: {
                status: "COMPLETED",
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    required: true,
                    where: {
                        collectionId,
                    },
                },
            ],
            attributes: ["price"],
            raw: true,
        });
        const totalVolume = sales.reduce((sum, sale) => sum + parseFloat(sale.price || 0), 0);
        const listedCount = await db_1.models.nftListing.count({
            where: {
                status: "ACTIVE",
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    required: true,
                    where: {
                        collectionId,
                    },
                },
            ],
        });
        const response = {
            ...collection.get({ plain: true }),
            stats: {
                tokenCount,
                ownersCount,
                floorPrice: floorListing ? parseFloat(String(floorListing.price)) : 0,
                totalVolume,
                listedCount,
            },
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Collection completed successfully");
        return response;
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to retrieve collection" });
    }
};
