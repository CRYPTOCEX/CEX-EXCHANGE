"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get creator stats with historical comparison",
    operationId: "getCreatorStats",
    tags: ["NFT", "Creator", "Stats"],
    logModule: "NFT",
    logTitle: "Get Creator Stats",
    description: "Get creator statistics with percentage changes compared to previous period",
    parameters: [
        {
            name: "timeframe",
            in: "query",
            schema: { type: "string", enum: ["7d", "30d", "90d"], default: "30d" },
            description: "Timeframe for comparison"
        }
    ],
    responses: {
        200: {
            description: "Creator stats retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "object",
                                properties: {
                                    totalVolume: { type: "number" },
                                    totalVolumeChange: { type: "number" },
                                    totalViews: { type: "number" },
                                    totalViewsChange: { type: "number" },
                                    totalSales: { type: "number" },
                                    totalSalesChange: { type: "number" },
                                    timeframe: { type: "string" }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        500: { description: "Server error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    try {
        const timeframe = query.timeframe || "30d";
        const now = new Date();
        let daysAgo;
        switch (timeframe) {
            case "7d":
                daysAgo = 7;
                break;
            case "90d":
                daysAgo = 90;
                break;
            default:
                daysAgo = 30;
        }
        const currentPeriodStart = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const previousPeriodStart = new Date(currentPeriodStart.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        let creator = await db_1.models.nftCreator.findOne({
            where: { userId: user.id }
        });
        if (!creator) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Creator Stats completed successfully");
            return {
                data: {
                    totalVolume: 0,
                    totalVolumeChange: 0,
                    totalViews: 0,
                    totalViewsChange: 0,
                    totalSales: 0,
                    totalSalesChange: 0,
                    timeframe
                }
            };
        }
        const currentSales = await db_1.models.nftSale.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'count'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.price')), 0), 'volume']
            ],
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    where: { creatorId: creator.id },
                    required: true
                }],
            where: {
                status: 'COMPLETED',
                createdAt: { [sequelize_1.Op.gte]: currentPeriodStart }
            },
            raw: true
        });
        const previousSales = await db_1.models.nftSale.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('nftSale.id')), 'count'],
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.price')), 0), 'volume']
            ],
            include: [{
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    where: { creatorId: creator.id },
                    required: true
                }],
            where: {
                status: 'COMPLETED',
                createdAt: {
                    [sequelize_1.Op.gte]: previousPeriodStart,
                    [sequelize_1.Op.lt]: currentPeriodStart
                }
            },
            raw: true
        });
        const currentViews = await db_1.models.nftToken.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('views')), 0), 'totalViews']
            ],
            where: {
                creatorId: creator.id,
                status: 'MINTED',
                updatedAt: { [sequelize_1.Op.gte]: currentPeriodStart }
            },
            raw: true
        });
        const totalViews = await db_1.models.nftToken.findOne({
            attributes: [
                [(0, sequelize_1.fn)('COALESCE', (0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('views')), 0), 'totalViews']
            ],
            where: {
                creatorId: creator.id,
                status: 'MINTED'
            },
            raw: true
        });
        const calculateChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };
        const currentSalesData = currentSales;
        const previousSalesData = previousSales;
        const currentViewsData = currentViews;
        const totalViewsData = totalViews;
        const currentVolume = parseFloat(String((currentSalesData === null || currentSalesData === void 0 ? void 0 : currentSalesData.volume) || 0));
        const previousVolume = parseFloat(String((previousSalesData === null || previousSalesData === void 0 ? void 0 : previousSalesData.volume) || 0));
        const volumeChange = calculateChange(currentVolume, previousVolume);
        const currentSalesCount = parseInt(String((currentSalesData === null || currentSalesData === void 0 ? void 0 : currentSalesData.count) || 0));
        const previousSalesCount = parseInt(String((previousSalesData === null || previousSalesData === void 0 ? void 0 : previousSalesData.count) || 0));
        const salesChange = calculateChange(currentSalesCount, previousSalesCount);
        const currentViewsCount = parseInt(String((currentViewsData === null || currentViewsData === void 0 ? void 0 : currentViewsData.totalViews) || 0));
        const previousViewsEstimate = parseInt(String((totalViewsData === null || totalViewsData === void 0 ? void 0 : totalViewsData.totalViews) || 0)) - currentViewsCount;
        const viewsChange = calculateChange(currentViewsCount, previousViewsEstimate > 0 ? previousViewsEstimate : 0);
        return {
            data: {
                totalVolume: currentVolume,
                totalVolumeChange: Math.round(volumeChange * 10) / 10,
                totalViews: parseInt(String((totalViewsData === null || totalViewsData === void 0 ? void 0 : totalViewsData.totalViews) || 0)),
                totalViewsChange: Math.round(viewsChange * 10) / 10,
                totalSales: currentSalesCount,
                totalSalesChange: Math.round(salesChange * 10) / 10,
                timeframe,
                currentPeriod: {
                    start: currentPeriodStart,
                    end: now,
                    volume: currentVolume,
                    sales: currentSalesCount,
                    views: currentViewsCount
                },
                previousPeriod: {
                    start: previousPeriodStart,
                    end: currentPeriodStart,
                    volume: previousVolume,
                    sales: previousSalesCount
                }
            }
        };
    }
    catch (error) {
        console_1.logger.error("NFT_CREATOR_STATS", "Failed to retrieve creator stats", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve creator stats"
        });
    }
};
