"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const stats_calculator_1 = require("./utils/stats-calculator");
const native_binary_1 = require("./utils/native-binary");
const mobile_shape_1 = require("@b/utils/mobile-shape");
exports.metadata = {
    summary: "Get Copy Trading Platform Statistics",
    description: "Retrieves public statistics about the copy trading platform including total leaders, followers, volume, and average ROI. `totalVolume` is denominated in `volumeCurrency`: the platform's single quote asset when every leader settles in the same one, and USD when they do not and the buckets had to be priced before they were added. Denominations with no usable USD rate are named in `unpricedCurrencies` and are NOT in the total, so a non-empty list makes `totalVolume` a lower bound. `avgRoi` and `avgWinRate` are weighted by trade count and are null — not zero — when no leader has closed a trade.",
    operationId: "getCopyTradingStats",
    tags: ["Copy Trading"],
    requiresAuth: false,
    logModule: "COPY",
    logTitle: "Get platform stats",
    responses: {
        200: {
            description: "Statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalLeaders: { type: "number" },
                            totalFollowers: { type: "number" },
                            totalVolume: { type: "number" },
                            volumeCurrency: {
                                type: "string",
                                description: "The unit `totalVolume` is in. 'USD' when buckets had to be converted.",
                            },
                            unpricedCurrencies: {
                                type: "array",
                                items: { type: "string" },
                                description: "Denominations excluded from `totalVolume` for want of a USD rate. Non-empty means the total is a LOWER BOUND.",
                            },
                            avgRoi: {
                                type: "number",
                                nullable: true,
                                description: "Trade-weighted average leader ROI, %. Null when no leader has closed a trade — that is 'unknown', not 'flat'.",
                            },
                            avgWinRate: {
                                type: "number",
                                nullable: true,
                                description: "Trade-weighted average leader win rate, %. Null when no leader has closed a trade.",
                            },
                            totalTrades: { type: "number" },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching platform statistics");
    const [leaders, totalFollowers] = await Promise.all([
        db_1.models.copyTradingLeader.findAll({
            where: {
                status: "ACTIVE",
                isPublic: true,
            },
            attributes: ["id"],
            raw: true,
        }),
        db_1.models.copyTradingFollower.count({
            where: {
                status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] },
            },
            distinct: true,
            col: "userId",
        }),
    ]);
    const totalLeaders = leaders.length;
    const leaderIds = leaders.map((l) => l.id);
    const leaderStatsMap = await (0, stats_calculator_1.calculateBatchLeaderStats)(leaderIds);
    const volumeByCurrency = {};
    const unpriced = new Set();
    let roiTradeWeighted = 0;
    let winRateTradeWeighted = 0;
    let tradesBehindAverages = 0;
    let totalTrades = 0;
    for (const stats of leaderStatsMap.values()) {
        if (stats.totalVolume) {
            volumeByCurrency[stats.volumeCurrency] =
                (volumeByCurrency[stats.volumeCurrency] || 0) + stats.totalVolume;
        }
        for (const currency of stats.unpricedCurrencies)
            unpriced.add(currency);
        totalTrades += stats.totalTrades;
        if (stats.totalTrades > 0) {
            roiTradeWeighted += stats.roi * stats.totalTrades;
            winRateTradeWeighted += stats.winRate * stats.totalTrades;
            tradesBehindAverages += stats.totalTrades;
        }
    }
    const units = Object.keys(volumeByCurrency);
    let totalVolume = 0;
    let volumeCurrency = "USD";
    if (units.length === 1) {
        volumeCurrency = units[0];
        totalVolume = volumeByCurrency[volumeCurrency];
    }
    else if (units.length > 1) {
        const summed = await (0, utils_1.sumInUSD)(volumeByCurrency);
        totalVolume = summed.total;
        for (const currency of summed.unpriced)
            unpriced.add(currency);
    }
    const volumeScale = volumeCurrency === "USD" ? 100 : 1e8;
    const avgRoi = tradesBehindAverages > 0
        ? Math.round((roiTradeWeighted / tradesBehindAverages) * 100) / 100
        : null;
    const avgWinRate = tradesBehindAverages > 0
        ? Math.round((winRateTradeWeighted / tradesBehindAverages) * 100) / 100
        : null;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Statistics retrieved");
    const payload = {
        totalLeaders,
        totalFollowers,
        totalVolume: Math.round(totalVolume * volumeScale) / volumeScale,
        volumeCurrency,
        unpricedCurrencies: [...unpriced],
        avgRoi,
        avgWinRate,
        totalTrades,
    };
    return (0, mobile_shape_1.shapeForClient)((0, native_binary_1.stripBinaryForNative)(payload, data), data);
};
