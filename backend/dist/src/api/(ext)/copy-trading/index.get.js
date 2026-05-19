"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("./utils");
const stats_calculator_1 = require("./utils/stats-calculator");
exports.metadata = {
    summary: "Get Copy Trading Dashboard",
    description: "Retrieves the user's copy trading dashboard overview including leader profile (if any), subscriptions summary, and recent trades.",
    operationId: "getCopyTradingDashboard",
    tags: ["Copy Trading"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get dashboard",
    responses: {
        200: {
            description: "Dashboard retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            isLeader: { type: "boolean" },
                            leaderProfile: { type: "object", nullable: true },
                            subscriptions: {
                                type: "object",
                                properties: {
                                    active: { type: "number" },
                                    paused: { type: "number" },
                                    totalProfit: { type: "number" },
                                    totalROI: { type: "number" },
                                },
                            },
                            recentTrades: { type: "array" },
                            settings: { type: "object" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader profile");
    const leaderProfile = await (0, utils_1.getLeaderByUserId)(user.id);
    const isLeader = !!leaderProfile && leaderProfile.status === "ACTIVE";
    let leaderStats = null;
    if (leaderProfile) {
        const activeFollowers = await db_1.models.copyTradingFollower.count({
            where: { leaderId: leaderProfile.id, status: "ACTIVE" },
        });
        const pausedFollowers = await db_1.models.copyTradingFollower.count({
            where: { leaderId: leaderProfile.id, status: "PAUSED" },
        });
        const activeFollowerIds = (await db_1.models.copyTradingFollower.findAll({
            where: { leaderId: leaderProfile.id, status: "ACTIVE" },
            attributes: ["id"],
            raw: true,
        })).map((f) => f.id);
        let totalAllocatedByFollowers = 0;
        if (activeFollowerIds.length > 0) {
            const allocAgg = (await db_1.models.copyTradingFollowerAllocation.findOne({
                where: {
                    followerId: { [sequelize_1.Op.in]: activeFollowerIds },
                    isActive: true,
                },
                attributes: [
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("baseAmount")), "totalBase"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("quoteAmount")), "totalQuote"],
                ],
                raw: true,
            }));
            totalAllocatedByFollowers =
                parseFloat((allocAgg === null || allocAgg === void 0 ? void 0 : allocAgg.totalBase) || 0) +
                    parseFloat((allocAgg === null || allocAgg === void 0 ? void 0 : allocAgg.totalQuote) || 0);
        }
        const recentLeaderTrades = await db_1.models.copyTradingTrade.findAll({
            where: { leaderId: leaderProfile.id, followerId: null },
            order: [["createdAt", "DESC"]],
            limit: 5,
        });
        leaderStats = {
            ...leaderProfile.toJSON(),
            activeFollowers,
            pausedFollowers,
            totalAllocatedByFollowers,
            recentTrades: recentLeaderTrades.map((t) => t.toJSON()),
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscriptions");
    const subscriptions = await db_1.models.copyTradingFollower.findAll({
        where: { userId: user.id, status: { [sequelize_1.Op.ne]: "STOPPED" } },
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
        ],
    });
    const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
    const pausedCount = subscriptions.filter((s) => s.status === "PAUSED").length;
    const subscriptionStats = await Promise.all(subscriptions.map((s) => (0, stats_calculator_1.calculateFollowerStats)(s.id)));
    const totalProfit = subscriptionStats.reduce((sum, st) => sum + (st.totalProfit || 0), 0);
    const roiSum = subscriptionStats.reduce((sum, st) => sum + (st.roi || 0), 0);
    const totalROI = subscriptionStats.length > 0 ? roiSum / subscriptionStats.length : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent trades");
    const followerIds = subscriptions.map((s) => s.id);
    let recentTrades = [];
    if (followerIds.length > 0) {
        recentTrades = await db_1.models.copyTradingTrade.findAll({
            where: { followerId: { [sequelize_1.Op.in]: followerIds } },
            include: [
                {
                    model: db_1.models.copyTradingLeader,
                    as: "leader",
                    attributes: ["id", "displayName"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 10,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching settings");
    const settings = await (0, utils_1.getCopyTradingSettings)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dashboard retrieved");
    return {
        isLeader,
        leaderProfile: leaderStats,
        subscriptions: {
            active: activeCount,
            paused: pausedCount,
            total: subscriptions.length,
            totalProfit,
            totalROI: Math.round(totalROI * 100) / 100,
            items: subscriptions.map((s) => s.toJSON()),
        },
        recentTrades: recentTrades.map((t) => t.toJSON()),
        settings: {
            maxLeadersPerFollower: settings.maxLeadersPerFollower,
            minAllocationAmount: settings.minAllocationAmount,
            maxAllocationPercent: settings.maxAllocationPercent,
        },
    };
};
