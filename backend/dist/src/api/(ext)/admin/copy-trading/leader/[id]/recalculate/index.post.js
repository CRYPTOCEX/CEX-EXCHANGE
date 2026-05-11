"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Recalculate Leader Statistics",
    description: "Forces a recalculation of all statistics for a leader.",
    operationId: "adminRecalculateCopyTradingLeaderStats",
    tags: ["Admin", "Copy Trading", "Leaders"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Recalculate leader statistics",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Leader ID",
        },
    ],
    responses: {
        200: { description: "Statistics recalculated successfully" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Leader not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { user, params, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader");
    const leader = await db_1.models.copyTradingLeader.findByPk(id);
    if (!leader) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Leader not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Storing old statistics");
    const leaderAny = leader;
    const oldStats = {
        totalTrades: (_a = leaderAny.totalTrades) !== null && _a !== void 0 ? _a : 0,
        winRate: (_b = leaderAny.winRate) !== null && _b !== void 0 ? _b : 0,
        totalProfit: (_c = leaderAny.totalProfit) !== null && _c !== void 0 ? _c : 0,
        totalVolume: (_d = leaderAny.totalVolume) !== null && _d !== void 0 ? _d : 0,
        totalFollowers: (_e = leaderAny.totalFollowers) !== null && _e !== void 0 ? _e : 0,
        roi: (_f = leaderAny.roi) !== null && _f !== void 0 ? _f : 0,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader's closed trades");
    const trades = await db_1.models.copyTradingTrade.findAll({
        where: {
            leaderId: id,
            followerId: null,
            status: "CLOSED",
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating trade statistics");
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => (t.profit || 0) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalVolume = trades.reduce((sum, t) => sum + (t.cost || 0), 0);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating follower metrics");
    const totalFollowers = await db_1.models.copyTradingFollower.count({
        where: { leaderId: id, status: "ACTIVE" },
    });
    const allocations = await db_1.models.copyTradingFollowerAllocation.findAll({
        where: { isActive: true },
        include: [{
                model: db_1.models.copyTradingFollower,
                as: "follower",
                where: { leaderId: id, status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] } },
                required: true,
            }],
    });
    const totalAllocated = allocations.reduce((sum, allocation) => {
        return sum + (parseFloat(allocation.baseAmount) || 0) + (parseFloat(allocation.quoteAmount) || 0);
    }, 0);
    const roi = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;
    const losses = trades.filter((t) => (t.profit || 0) < 0);
    const maxDrawdown = losses.length > 0
        ? Math.min(...losses.map((t) => t.profit || 0))
        : 0;
    let avgTradeDuration = 0;
    const tradesWithDuration = trades.filter((t) => t.closedAt && t.createdAt);
    if (tradesWithDuration.length > 0) {
        const totalDuration = tradesWithDuration.reduce((sum, t) => {
            return sum + (new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime());
        }, 0);
        avgTradeDuration = totalDuration / tradesWithDuration.length / (1000 * 60);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating follower trade statistics");
    const followerTrades = await db_1.models.copyTradingTrade.findAll({
        where: {
            leaderId: id,
            followerId: { [sequelize_1.Op.ne]: null },
            status: "CLOSED",
        },
    });
    const totalCopiedTrades = followerTrades.length;
    const totalCopiedVolume = followerTrades.reduce((sum, t) => sum + (t.cost || 0), 0);
    const totalCopiedProfit = followerTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating leader statistics");
    const newStats = {
        totalTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        totalFollowers,
        roi: Math.round(roi * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: id,
        action: "RECALCULATE_STATS",
        oldValue: oldStats,
        newValue: newStats,
        adminId: user.id,
        reason: "Manual statistics recalculation",
        metadata: {
            totalCopiedTrades,
            totalCopiedVolume,
            totalCopiedProfit,
            totalAllocated,
            avgTradeDuration,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Statistics recalculated successfully");
    return {
        message: "Statistics recalculated successfully",
        leader: {
            id: leader.id,
            displayName: leader.displayName,
        },
        oldStats,
        newStats,
        changes: {
            totalTrades: newStats.totalTrades - oldStats.totalTrades,
            winRate: Math.round((newStats.winRate - oldStats.winRate) * 100) / 100,
            totalProfit: Math.round((newStats.totalProfit - oldStats.totalProfit) * 100) / 100,
            totalFollowers: newStats.totalFollowers - oldStats.totalFollowers,
            roi: Math.round((newStats.roi - oldStats.roi) * 100) / 100,
        },
        additionalMetrics: {
            totalCopiedTrades,
            totalCopiedVolume: Math.round(totalCopiedVolume * 100) / 100,
            totalCopiedProfit: Math.round(totalCopiedProfit * 100) / 100,
            totalAllocated: Math.round(totalAllocated * 100) / 100,
            avgTradeDurationMinutes: Math.round(avgTradeDuration * 100) / 100,
        },
    };
};
