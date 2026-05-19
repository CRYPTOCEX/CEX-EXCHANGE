"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const stats_calculator_1 = require("./utils/stats-calculator");
exports.metadata = {
    summary: "Get Copy Trading Platform Statistics",
    description: "Retrieves public statistics about the copy trading platform including total leaders, followers, volume, and average ROI.",
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
                            avgRoi: { type: "number" },
                            avgWinRate: { type: "number" },
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
    const leaders = await db_1.models.copyTradingLeader.findAll({
        where: {
            status: "ACTIVE",
            isPublic: true,
        },
        attributes: ["id"],
        raw: true,
    });
    const totalLeaders = leaders.length;
    const leaderIds = leaders.map((l) => l.id);
    const totalFollowers = await db_1.models.copyTradingFollower.count({
        where: {
            status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] },
        },
        distinct: true,
        col: "userId",
    });
    const leaderStatsMap = await (0, stats_calculator_1.calculateBatchLeaderStats)(leaderIds);
    let totalVolume = 0;
    let totalRoi = 0;
    let totalWinRate = 0;
    let totalTrades = 0;
    let leadersWithStats = 0;
    for (const stats of leaderStatsMap.values()) {
        totalVolume += stats.totalVolume;
        totalTrades += stats.totalTrades;
        if (stats.totalTrades > 0) {
            totalRoi += stats.roi;
            totalWinRate += stats.winRate;
            leadersWithStats++;
        }
    }
    const avgRoi = leadersWithStats > 0 ? totalRoi / leadersWithStats : 0;
    const avgWinRate = leadersWithStats > 0 ? totalWinRate / leadersWithStats : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Statistics retrieved");
    return {
        totalLeaders,
        totalFollowers,
        totalVolume: Math.round(totalVolume * 100) / 100,
        avgRoi: Math.round(avgRoi * 100) / 100,
        avgWinRate: Math.round(avgWinRate * 100) / 100,
        totalTrades,
    };
};
