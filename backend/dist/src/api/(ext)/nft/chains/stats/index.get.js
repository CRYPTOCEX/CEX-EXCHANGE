"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get NFT marketplace chain statistics",
    operationId: "getNftChainStats",
    tags: ["NFT", "Chains", "Stats"],
    logModule: "NFT",
    logTitle: "Get Chain Stats",
    description: "Get statistics for all blockchain networks with NFT activity",
    responses: {
        200: {
            description: "Chain statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                chain: { type: "string" },
                                nftCount: { type: "integer" },
                                collectionCount: { type: "integer" },
                                volume24h: { type: "number" },
                                totalVolume: { type: "number" }
                            }
                        }
                    }
                }
            }
        },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: false
};
exports.default = async (data) => {
    try {
        const { ctx } = data;
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const chainStats = await db_1.models.nftCollection.findAll({
            attributes: [
                'chain',
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM nft_token t
            WHERE t.collectionId = nftCollection.id
            AND t.status = 'MINTED'
          )`),
                    'nftCount'
                ],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftCollection.id')), 'collectionCount'],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COALESCE(SUM(s.price), 0)
            FROM nft_sale s
            INNER JOIN nft_token t ON s.tokenId = t.id
            WHERE t.collectionId = nftCollection.id
            AND s.status = 'COMPLETED'
            AND s.createdAt >= '${cutoff24h.toISOString()}'
          )`),
                    'volume24h'
                ],
                [
                    (0, sequelize_1.literal)(`(
            SELECT COALESCE(SUM(s.price), 0)
            FROM nft_sale s
            INNER JOIN nft_token t ON s.tokenId = t.id
            WHERE t.collectionId = nftCollection.id
            AND s.status = 'COMPLETED'
          )`),
                    'totalVolume'
                ]
            ],
            where: {
                status: 'ACTIVE'
            },
            group: ['chain'],
            having: (0, sequelize_1.literal)('nftCount > 0'),
            raw: true
        });
        const formattedStats = chainStats.map((stat) => ({
            chain: stat.chain || 'ETH',
            nftCount: parseInt(stat.nftCount) || 0,
            collectionCount: parseInt(stat.collectionCount) || 0,
            volume24h: parseFloat(stat.volume24h) || 0,
            totalVolume: parseFloat(stat.totalVolume) || 0,
        }));
        formattedStats.sort((a, b) => b.nftCount - a.nftCount);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Chain Stats completed successfully");
        return formattedStats;
    }
    catch (error) {
        console_1.logger.error("NFT_CHAIN_STATS", "Failed to retrieve chain statistics", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve chain statistics"
        });
    }
};
