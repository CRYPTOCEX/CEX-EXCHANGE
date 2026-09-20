"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get NFT collection statistics",
    operationId: "getNftCollectionStats",
    tags: ["NFT", "Collection", "Stats"],
    logModule: "NFT",
    logTitle: "Get Collection Stats",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Collection ID (UUID) or slug",
            required: true,
            schema: { type: "string" }
        }
    ],
    responses: {
        200: {
            description: "Collection statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalSupply: { type: "integer" },
                            totalMinted: { type: "integer" },
                            totalListed: { type: "integer" },
                            floorPrice: { type: "number" },
                            totalVolume: { type: "number" },
                            averagePrice: { type: "number" },
                            uniqueOwners: { type: "integer" },
                            totalSales: { type: "integer" },
                            change24h: { type: "number" }
                        }
                    }
                }
            }
        },
        404: { description: "Collection not found" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: false
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { params, ctx } = data;
    const { id } = params;
    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const collection = await db_1.models.nftCollection.findOne({
            where: isUUID ? { id } : { slug: id }
        });
        if (!collection) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Collection not found"
            });
        }
        const collectionId = collection.id;
        const stats = await db_1.models.nftToken.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'totalMinted'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.fn)('DISTINCT', (0, sequelize_1.col)('ownerId'))), 'uniqueOwners']
            ],
            where: {
                collectionId,
                status: 'MINTED'
            },
            raw: true
        });
        const listedCount = await db_1.models.nftToken.count({
            where: {
                collectionId,
                status: 'MINTED',
                isListed: true
            }
        });
        const salesStats = await db_1.models.nftSale.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'totalSales'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.price')), 0), 'totalVolume'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('AVG', (0, sequelize_1.col)('nftSale.price')), 0), 'averagePrice'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('MIN', (0, sequelize_1.col)('nftSale.price')), 0), 'floorPrice']
            ],
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    where: { collectionId },
                    required: true
                }],
            where: {
                status: 'COMPLETED'
            },
            raw: true
        });
        const change24h = 0;
        const statsResult = stats;
        const salesStatsResult = salesStats;
        const response = {
            totalSupply: collection.totalSupply || 0,
            totalMinted: parseInt(String((_a = statsResult === null || statsResult === void 0 ? void 0 : statsResult.totalMinted) !== null && _a !== void 0 ? _a : 0)),
            totalListed: listedCount,
            uniqueOwners: parseInt(String((_b = statsResult === null || statsResult === void 0 ? void 0 : statsResult.uniqueOwners) !== null && _b !== void 0 ? _b : 0)),
            totalSales: parseInt(String((_c = salesStatsResult === null || salesStatsResult === void 0 ? void 0 : salesStatsResult.totalSales) !== null && _c !== void 0 ? _c : 0)),
            totalVolume: parseFloat(String((_d = salesStatsResult === null || salesStatsResult === void 0 ? void 0 : salesStatsResult.totalVolume) !== null && _d !== void 0 ? _d : 0)),
            averagePrice: parseFloat(String((_e = salesStatsResult === null || salesStatsResult === void 0 ? void 0 : salesStatsResult.averagePrice) !== null && _e !== void 0 ? _e : 0)),
            floorPrice: parseFloat(String((_f = salesStatsResult === null || salesStatsResult === void 0 ? void 0 : salesStatsResult.floorPrice) !== null && _f !== void 0 ? _f : 0)),
            change24h
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Collection Stats completed successfully");
        return response;
    }
    catch (error) {
        console_1.logger.error("NFT_STATS", "Failed to retrieve collection statistics", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve collection statistics"
        });
    }
};
