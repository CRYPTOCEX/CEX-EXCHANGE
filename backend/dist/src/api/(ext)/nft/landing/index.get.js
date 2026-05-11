"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get NFT Landing Page Data",
    description: "Retrieves comprehensive data for the NFT landing page including stats, featured collections, and recent sales.",
    operationId: "getNFTLandingData",
    tags: ["NFT", "Landing"],
    requiresAuth: false,
    responses: {
        200: {
            description: "NFT landing data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            featuredCollections: { type: "array" },
                            recentSales: { type: "array" },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const [collectionCount, tokenCount, creatorCount, volumeStats, featuredCollections, recentSales,] = await Promise.all([
        db_1.models.nftCollection.count({
            where: { status: "ACTIVE" },
        }),
        db_1.models.nftToken.count(),
        db_1.models.nftCreator.count({
            where: { isVerified: true },
        }),
        db_1.models.nftSale.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("price")), "totalVolume"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalSales"],
            ],
            where: { status: "COMPLETED" },
            raw: true,
        }),
        db_1.models.nftCollection.findAll({
            where: { status: "ACTIVE" },
            attributes: ["id", "name", "logoImage", "description", "chain"],
            order: [["createdAt", "DESC"]],
            limit: 6,
        }),
        db_1.models.nftSale.findAll({
            where: { status: "COMPLETED" },
            attributes: ["id", "price", "currency", "createdAt"],
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 6,
        }),
    ]);
    const totalVolume = parseFloat(volumeStats === null || volumeStats === void 0 ? void 0 : volumeStats.totalVolume) || 0;
    return {
        stats: {
            collections: collectionCount,
            tokens: tokenCount,
            totalVolume,
            creators: creatorCount,
        },
        featuredCollections: featuredCollections.map((c) => ({
            id: c.id,
            name: c.name,
            image: c.logoImage,
            description: c.description,
            chain: c.chain,
            floorPrice: 0,
            volume: 0,
            itemCount: 0,
            ownerCount: 0,
        })),
        recentSales: recentSales.map((s) => {
            var _a, _b;
            return ({
                id: s.id,
                name: ((_a = s.token) === null || _a === void 0 ? void 0 : _a.name) || "NFT",
                price: s.price,
                currency: s.currency,
                image: (_b = s.token) === null || _b === void 0 ? void 0 : _b.image,
                createdAt: s.createdAt,
            });
        }),
    };
};
