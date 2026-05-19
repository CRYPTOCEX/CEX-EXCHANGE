"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Retrieves affiliate program statistics",
    description: "Fetches public statistics for the affiliate program including total affiliates, total paid out, average monthly earnings, and success rate.",
    operationId: "getAffiliateStats",
    tags: ["Affiliate", "Stats"],
    logModule: "AFFILIATE",
    logTitle: "Get Public Stats",
    responses: {
        200: {
            description: "Affiliate stats retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalAffiliates: {
                                type: "number",
                                description: "Total number of affiliates with referrals",
                            },
                            totalPaidOut: {
                                type: "number",
                                description: "Total amount paid out in rewards",
                            },
                            avgMonthlyEarnings: {
                                type: "number",
                                description: "Average monthly earnings per affiliate",
                            },
                            successRate: {
                                type: "number",
                                description: "Success rate percentage (active referrals / total referrals)",
                            },
                        },
                        required: ["totalAffiliates", "totalPaidOut", "avgMonthlyEarnings", "successRate"],
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Affiliate Program Stats");
    try {
        const [totalAffiliatesCount, totalPaidOutResult, totalReferralsCount, activeReferralsCount, avgEarningsResult,] = await Promise.all([
            db_1.models.mlmReferral.count({
                distinct: true,
                col: "referrerId",
            }),
            db_1.models.mlmReferralReward.findOne({
                attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "total"]],
                raw: true,
            }),
            db_1.models.mlmReferral.count(),
            db_1.models.mlmReferral.count({
                where: { status: "ACTIVE" },
            }),
            db_1.models.mlmReferralReward.findOne({
                attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("reward")), "avgReward"]],
                where: {
                    createdAt: {
                        [sequelize_1.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
                raw: true,
            }),
        ]);
        const totalPaidOut = parseFloat((_a = totalPaidOutResult === null || totalPaidOutResult === void 0 ? void 0 : totalPaidOutResult.total) !== null && _a !== void 0 ? _a : "0") || 0;
        const avgMonthlyEarnings = parseFloat((_b = avgEarningsResult === null || avgEarningsResult === void 0 ? void 0 : avgEarningsResult.avgReward) !== null && _b !== void 0 ? _b : "0") || 0;
        const successRate = totalReferralsCount > 0
            ? Math.round((activeReferralsCount / totalReferralsCount) * 100)
            : 0;
        const stats = {
            totalAffiliates: totalAffiliatesCount,
            totalPaidOut: Math.round(totalPaidOut * 100) / 100,
            avgMonthlyEarnings: Math.round(avgMonthlyEarnings * 100) / 100,
            successRate,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Stats fetched: ${stats.totalAffiliates} affiliates, $${stats.totalPaidOut} paid out`);
        return stats;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error retrieving affiliate stats: ${error.message}`,
        });
    }
};
