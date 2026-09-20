"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const core_1 = require("./utils/core");
const settings_core_1 = require("./utils/settings-core");
const stats_calculator_1 = require("./utils/stats-calculator");
const utils_1 = require("@b/api/finance/currency/utils");
const native_binary_1 = require("./utils/native-binary");
const mobile_shape_1 = require("@b/utils/mobile-shape");
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
                                    totalProfit: {
                                        type: "number",
                                        description: "Realised profit across subscriptions, denominated in totalProfitCurrency. A lower bound whenever unpricedProfitCurrencies is non-empty.",
                                    },
                                    totalProfitCurrency: {
                                        type: "string",
                                        description: "Unit of totalProfit: the follower's own quote asset when every subscription settles in one, otherwise USD.",
                                    },
                                    totalProfitByCurrency: {
                                        type: "object",
                                        additionalProperties: { type: "number" },
                                        description: "Unconverted realised profit per denomination, for callers that show one line per unit.",
                                    },
                                    unpricedProfitCurrencies: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Denominations excluded from totalProfit for want of a USD rate. Never counted as zero.",
                                    },
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
    const leaderProfile = await (0, core_1.getLeaderByUserId)(user.id);
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
    const profitByCurrency = {};
    for (const st of subscriptionStats) {
        const amount = st.totalProfit || 0;
        if (!amount)
            continue;
        const unit = st.profitCurrency || "USD";
        profitByCurrency[unit] = (profitByCurrency[unit] || 0) + amount;
    }
    const profitUnits = Object.keys(profitByCurrency);
    let totalProfit = 0;
    let totalProfitCurrency = "USD";
    let unpricedProfitCurrencies = [
        ...new Set(subscriptionStats.flatMap((st) => st.unpricedProfitCurrencies || [])),
    ];
    if (profitUnits.length === 1) {
        totalProfitCurrency = profitUnits[0];
        totalProfit = profitByCurrency[totalProfitCurrency];
    }
    else if (profitUnits.length > 1) {
        const summed = await (0, utils_1.sumInUSD)(profitByCurrency);
        totalProfit = summed.total;
        unpricedProfitCurrencies = [
            ...new Set([...unpricedProfitCurrencies, ...summed.unpriced]),
        ];
    }
    const roiSamples = subscriptionStats.filter((st) => st.roiAvailable !== false);
    const roiSum = roiSamples.reduce((sum, st) => sum + (st.roi || 0), 0);
    const totalROI = roiSamples.length > 0 ? roiSum / roiSamples.length : 0;
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
    const settings = await (0, settings_core_1.getCopyTradingSettings)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dashboard retrieved");
    const payload = {
        isLeader,
        leaderProfile: leaderStats,
        subscriptions: {
            active: activeCount,
            paused: pausedCount,
            total: subscriptions.length,
            totalProfit,
            totalProfitCurrency,
            totalProfitByCurrency: profitByCurrency,
            unpricedProfitCurrencies,
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
    return (0, mobile_shape_1.shapeForClient)((0, native_binary_1.stripBinaryForNative)(payload, data), data);
};
