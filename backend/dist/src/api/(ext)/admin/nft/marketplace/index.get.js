"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get marketplace management data",
    operationId: "getMarketplaceManagement",
    tags: ["Admin", "NFT", "Marketplace"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Marketplace",
    parameters: [
        {
            name: "page",
            in: "query",
            description: "Page number",
            schema: { type: "integer", default: 1 }
        },
        {
            name: "perPage",
            in: "query",
            description: "Items per page",
            schema: { type: "integer", default: 20, maximum: 100 }
        },
        {
            name: "status",
            in: "query",
            description: "Filter by listing status",
            schema: {
                type: "string",
                enum: ["ACTIVE", "SOLD", "CANCELLED", "EXPIRED"]
            }
        },
        {
            name: "type",
            in: "query",
            description: "Filter by listing type",
            schema: {
                type: "string",
                enum: ["FIXED_PRICE", "AUCTION", "BUNDLE"]
            }
        }
    ],
    responses: {
        200: {
            description: "Marketplace data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    listings: { type: "array" },
                                    pagination: { $ref: "#/components/schemas/Pagination" },
                                    stats: { type: "object" }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.marketplace"
};
exports.default = async (data) => {
    var _a, _b, _c;
    try {
        const { query, ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching marketplace data");
        const { page = 1, perPage = 20, status, type } = query;
        const whereConditions = {};
        if (status) {
            whereConditions.status = status;
        }
        if (type) {
            whereConditions.type = type;
        }
        const limit = Math.min(parseInt(perPage), 100);
        const offset = (parseInt(page) - 1) * limit;
        const { count, rows: listings } = await db_1.models.nftListing.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image", "metadataUri"],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "logoImage", "contractAddress"]
                        },
                        {
                            model: db_1.models.user,
                            as: "creator",
                            attributes: ["id", "firstName", "lastName", "avatar"]
                        }
                    ]
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName", "avatar", "walletAddress"]
                },
                {
                    model: db_1.models.nftBid,
                    as: "bids",
                    attributes: ["id", "amount", "createdAt"],
                    include: [
                        {
                            model: db_1.models.user,
                            as: "bidder",
                            attributes: ["id", "firstName", "lastName", "avatar"]
                        }
                    ],
                    order: [["amount", "DESC"]],
                    limit: 3
                },
                {
                    model: db_1.models.nftSale,
                    as: "sale",
                    attributes: ["id", "price", "currency", "createdAt"],
                    include: [
                        {
                            model: db_1.models.user,
                            as: "buyer",
                            attributes: ["id", "firstName", "lastName", "avatar"]
                        }
                    ],
                    required: false
                }
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
            distinct: true
        });
        const stats = (await Promise.all([
            db_1.models.nftListing.findAll({
                attributes: [
                    'status',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
                ],
                group: ['status'],
                raw: true
            }),
            db_1.models.nftListing.findAll({
                attributes: [
                    'type',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
                ],
                group: ['type'],
                raw: true
            }),
            db_1.models.nftSale.findAll({
                attributes: [
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'totalVolume'],
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'totalSales'],
                    [(0, sequelize_1.fn)('AVG', (0, sequelize_1.col)('price')), 'avgPrice']
                ],
                where: { status: "COMPLETED" },
                raw: true
            }),
            db_1.models.nftListing.count({
                where: {
                    type: "AUCTION",
                    status: "ACTIVE",
                    endTime: {
                        [sequelize_1.Op.between]: [new Date(), new Date(Date.now() + 24 * 60 * 60 * 1000)]
                    }
                }
            }),
            db_1.models.nftListing.count({
                where: {
                    status: "ACTIVE",
                    endTime: {
                        [sequelize_1.Op.lt]: new Date()
                    }
                }
            })
        ]));
        const [statusStats, typeStats, volumeStats, auctionsEndingSoon, expiredListings] = stats;
        const processedListings = listings.map(listing => {
            const now = new Date();
            const endTime = listing.endTime ? new Date(listing.endTime) : null;
            const hasEnded = endTime && endTime <= now;
            const timeLeft = hasEnded ? 0 : (endTime ? endTime.getTime() - now.getTime() : null);
            const currentBid = listing.bids && listing.bids.length > 0
                ? Math.max(...listing.bids.map(bid => typeof bid.amount === 'number' ? bid.amount : parseFloat(String(bid.amount))))
                : null;
            return {
                ...listing.toJSON(),
                computed: {
                    hasEnded,
                    timeLeft,
                    currentBid,
                    bidCount: listing.bids ? listing.bids.length : 0,
                    needsAttention: hasEnded && listing.status === "ACTIVE"
                }
            };
        });
        const totalPages = Math.ceil(count / limit);
        const marketplaceStats = {
            byStatus: statusStats.reduce((acc, stat) => {
                acc[stat.status] = parseInt(stat.count);
                return acc;
            }, {}),
            byType: typeStats.reduce((acc, stat) => {
                acc[stat.type] = parseInt(stat.count);
                return acc;
            }, {}),
            volume: {
                total: parseFloat(((_a = volumeStats[0]) === null || _a === void 0 ? void 0 : _a.totalVolume) || "0"),
                totalSales: parseInt(((_b = volumeStats[0]) === null || _b === void 0 ? void 0 : _b.totalSales) || "0"),
                averagePrice: parseFloat(((_c = volumeStats[0]) === null || _c === void 0 ? void 0 : _c.avgPrice) || "0")
            },
            alerts: {
                auctionsEndingSoon,
                expiredListings
            }
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Marketplace data retrieved successfully");
        return {
            message: "Marketplace data retrieved successfully",
            data: {
                listings: processedListings,
                pagination: {
                    page: parseInt(page),
                    perPage: limit,
                    total: count,
                    totalPages,
                    hasNext: parseInt(page) < totalPages,
                    hasPrev: parseInt(page) > 1
                },
                stats: marketplaceStats
            }
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Get marketplace management error", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve marketplace data"
        });
    }
};
