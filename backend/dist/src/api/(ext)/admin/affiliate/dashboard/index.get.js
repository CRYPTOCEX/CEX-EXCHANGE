"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get affiliate dashboard analytics and metrics",
    description: "Retrieves comprehensive affiliate dashboard data including total affiliates, referrals, earnings metrics with month-over-month comparisons, conversion rates, monthly earnings chart data for the last 12 months, affiliate status distribution, and top-performing affiliates ranked by earnings.",
    operationId: "getAffiliateDashboard",
    tags: ["Admin", "Affiliate", "Dashboard"],
    requiresAuth: true,
    permission: "access.affiliate",
    responses: {
        200: {
            description: "Affiliate dashboard data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            metrics: {
                                type: "object",
                                description: "Key performance metrics with month-over-month changes",
                                properties: {
                                    totalAffiliates: {
                                        type: "object",
                                        properties: {
                                            value: { type: "integer", description: "Total number of unique affiliates (referrers)" },
                                            change: { type: "string", description: "Percentage change compared to previous month" },
                                            trend: { type: "string", enum: ["up", "down"], description: "Trend direction" },
                                        },
                                        required: ["value", "change", "trend"],
                                    },
                                    totalReferrals: {
                                        type: "object",
                                        properties: {
                                            value: { type: "integer", description: "Total number of referrals" },
                                            change: { type: "string", description: "Percentage change compared to previous month" },
                                            trend: { type: "string", enum: ["up", "down"], description: "Trend direction" },
                                        },
                                        required: ["value", "change", "trend"],
                                    },
                                    totalEarnings: {
                                        type: "object",
                                        properties: {
                                            value: { type: "number", format: "float", description: "Total earnings across all affiliates" },
                                            change: { type: "string", description: "Percentage change compared to previous month" },
                                            trend: { type: "string", enum: ["up", "down"], description: "Trend direction" },
                                        },
                                        required: ["value", "change", "trend"],
                                    },
                                    conversionRate: {
                                        type: "object",
                                        properties: {
                                            value: { type: "integer", description: "Current month conversion rate percentage" },
                                            change: { type: "string", description: "Percentage point change compared to previous month" },
                                            trend: { type: "string", enum: ["up", "down"], description: "Trend direction" },
                                        },
                                        required: ["value", "change", "trend"],
                                    },
                                },
                                required: ["totalAffiliates", "totalReferrals", "totalEarnings", "conversionRate"],
                            },
                            charts: {
                                type: "object",
                                description: "Chart data for visualizations",
                                properties: {
                                    monthlyEarnings: {
                                        type: "array",
                                        description: "Monthly earnings data for the last 12 months",
                                        items: {
                                            type: "object",
                                            properties: {
                                                month: { type: "string", description: "Month in YYYY-MM format" },
                                                amount: { type: "number", format: "float", description: "Total earnings for the month" },
                                            },
                                            required: ["month", "amount"],
                                        },
                                    },
                                    affiliateStatus: {
                                        type: "array",
                                        description: "Distribution of affiliates by status",
                                        items: {
                                            type: "object",
                                            properties: {
                                                status: { type: "string", description: "Affiliate status" },
                                                count: { type: "integer", description: "Number of affiliates with this status" },
                                            },
                                            required: ["status", "count"],
                                        },
                                    },
                                    topAffiliates: {
                                        type: "array",
                                        description: "Top performing affiliates ranked by earnings",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string", description: "Affiliate user ID" },
                                                name: { type: "string", description: "Affiliate full name" },
                                                referrals: { type: "integer", description: "Total number of referrals" },
                                                earnings: { type: "number", format: "float", description: "Total earnings" },
                                                conversionRate: { type: "integer", description: "Conversion rate percentage" },
                                            },
                                            required: ["id", "name", "referrals", "earnings", "conversionRate"],
                                        },
                                    },
                                },
                                required: ["monthlyEarnings", "affiliateStatus", "topAffiliates"],
                            },
                        },
                        required: ["metrics", "charts"],
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Get affiliate dashboard data",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing dashboard metrics");
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating total affiliates");
    const totalAffiliatesRow = await db_1.models.mlmReferral.findOne({
        attributes: [
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("DISTINCT `referrerId`")), "totalAffiliates"],
        ],
        raw: true,
    });
    const totalAffiliates = parseInt(totalAffiliatesRow === null || totalAffiliatesRow === void 0 ? void 0 : totalAffiliatesRow.totalAffiliates, 10) || 0;
    const totalReferrals = await db_1.models.mlmReferral.count();
    const referralGrowth = await db_1.models.mlmReferral.findOne({
        attributes: [
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`)),
                "currentReferrals",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`)),
                "previousReferrals",
            ],
        ],
        raw: true,
    });
    const currentReferrals = parseInt(referralGrowth === null || referralGrowth === void 0 ? void 0 : referralGrowth.currentReferrals, 10) || 0;
    const previousReferrals = parseInt(referralGrowth === null || referralGrowth === void 0 ? void 0 : referralGrowth.previousReferrals, 10) || 0;
    const referralsChange = previousReferrals > 0
        ? Math.round(((currentReferrals - previousReferrals) / previousReferrals) * 100)
        : 0;
    const referralsTrend = currentReferrals >= previousReferrals ? "up" : "down";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating total earnings");
    const totalEarningsRow = await db_1.models.mlmReferralReward.findOne({
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "totalEarnings"]],
        raw: true,
    });
    const totalEarnings = parseFloat(totalEarningsRow === null || totalEarningsRow === void 0 ? void 0 : totalEarningsRow.totalEarnings) || 0;
    const earningsGrowth = await db_1.models.mlmReferralReward.findOne({
        attributes: [
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN reward ELSE 0 END`)),
                "currentEarnings",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN reward ELSE 0 END`)),
                "previousEarnings",
            ],
        ],
        raw: true,
    });
    const currentEarnings = parseFloat(earningsGrowth === null || earningsGrowth === void 0 ? void 0 : earningsGrowth.currentEarnings) || 0;
    const previousEarnings = parseFloat(earningsGrowth === null || earningsGrowth === void 0 ? void 0 : earningsGrowth.previousEarnings) || 0;
    const earningsChange = previousEarnings > 0
        ? Math.round(((currentEarnings - previousEarnings) / previousEarnings) * 100)
        : 0;
    const earningsTrend = currentEarnings >= previousEarnings ? "up" : "down";
    const totalRewardRecords = await db_1.models.mlmReferralReward.count();
    const rewardCountGrowth = await db_1.models.mlmReferralReward.findOne({
        attributes: [
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`)),
                "currentRewardCount",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`)),
                "previousRewardCount",
            ],
        ],
        raw: true,
    });
    const currentRewardCount = parseInt(rewardCountGrowth === null || rewardCountGrowth === void 0 ? void 0 : rewardCountGrowth.currentRewardCount, 10) || 0;
    const previousRewardCount = parseInt(rewardCountGrowth === null || rewardCountGrowth === void 0 ? void 0 : rewardCountGrowth.previousRewardCount, 10) || 0;
    const thisMonthConversion = totalReferrals > 0
        ? Math.round((currentRewardCount / totalReferrals) * 100)
        : 0;
    const lastMonthConversion = totalReferrals > 0
        ? Math.round((previousRewardCount / totalReferrals) * 100)
        : 0;
    const conversionChange = lastMonthConversion
        ? thisMonthConversion - lastMonthConversion
        : 0;
    const conversionTrend = thisMonthConversion >= lastMonthConversion ? "up" : "down";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Aggregating dashboard metrics");
    const metrics = {
        totalAffiliates: {
            value: totalAffiliates,
            change: `${referralsChange}`,
            trend: referralsTrend,
        },
        totalReferrals: {
            value: totalReferrals,
            change: `${referralsChange}`,
            trend: referralsTrend,
        },
        totalEarnings: {
            value: totalEarnings,
            change: `${earningsChange}`,
            trend: earningsTrend,
        },
        conversionRate: {
            value: thisMonthConversion,
            change: `${conversionChange}`,
            trend: conversionTrend,
        },
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating monthly earnings chart data");
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const earningsByMonthRaw = await db_1.models.mlmReferralReward.findAll({
        attributes: [
            [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), "%Y-%m"), "month"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "amount"],
        ],
        where: {
            createdAt: {
                [sequelize_1.Op.gte]: new Date(now.getFullYear(), now.getMonth() - 11, 1),
            },
        },
        group: ["month"],
        raw: true,
    });
    const earningsMap = earningsByMonthRaw.reduce((acc, row) => {
        acc[row.month] = parseFloat(row.amount);
        return acc;
    }, {});
    const monthlyEarnings = months.map((month) => ({
        month,
        amount: earningsMap[month] || 0,
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating affiliate status distribution");
    const statusRows = await db_1.models.mlmReferral.findAll({
        attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "count"]],
        group: ["status"],
        raw: true,
    });
    const affiliateStatus = statusRows.map((row) => ({
        status: row.status,
        count: parseInt(row.count, 10),
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Identifying top affiliates");
    const referralCounts = await db_1.models.mlmReferral.findAll({
        attributes: ["referrerId", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "referrals"]],
        group: ["referrerId"],
        raw: true,
    });
    const rewardCounts = await db_1.models.mlmReferralReward.findAll({
        attributes: [
            "referrerId",
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "earnings"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "rewardCount"],
        ],
        group: ["referrerId"],
        raw: true,
    });
    const rewardMap = rewardCounts.reduce((acc, row) => {
        acc[row.referrerId] = {
            earnings: parseFloat(row.earnings),
            rewardCount: parseInt(row.rewardCount, 10),
        };
        return acc;
    }, {});
    const affiliateIds = referralCounts.map((r) => r.referrerId);
    const users = await db_1.models.user.findAll({
        where: { id: affiliateIds },
        attributes: ["id", "firstName", "lastName"],
        raw: true,
    });
    const userMap = users.reduce((acc, u) => {
        acc[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
        return acc;
    }, {});
    const topAffiliates = referralCounts
        .map((r) => {
        const earnData = rewardMap[r.referrerId] || {
            earnings: 0,
            rewardCount: 0,
        };
        const conv = r.referrals
            ? Math.round((earnData.rewardCount / r.referrals) * 100)
            : 0;
        return {
            id: r.referrerId,
            name: userMap[r.referrerId] || r.referrerId,
            referrals: parseInt(r.referrals, 10),
            earnings: earnData.earnings,
            conversionRate: conv,
        };
    })
        .sort((a, b) => b.earnings - a.earnings);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dashboard data retrieved successfully");
    return {
        metrics,
        charts: { monthlyEarnings, affiliateStatus, topAffiliates },
    };
};
