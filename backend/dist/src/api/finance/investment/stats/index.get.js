"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = getInvestmentStats;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const ACTIVE_INVESTMENT_STATUS = ["ACTIVE", "RUNNING", "OPEN"];
const COMPLETED_INVESTMENT_STATUS = ["COMPLETED", "CLOSED"];
exports.metadata = {
    summary: "Get Investment Platform Statistics",
    description: "Retrieves platform-wide investment stats: number of active investors, total invested amount, average return (completed investments), and number of investment plans.",
    operationId: "getInvestmentStats",
    tags: ["Investment", "Stats"],
    responses: {
        200: {
            description: "Investment platform statistics retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            activeInvestors: {
                                type: "number",
                                description: "Unique users with active investments.",
                            },
                            totalInvested: {
                                type: "number",
                                description: "Total amount invested (all time).",
                            },
                            averageReturn: {
                                type: "number",
                                description: "Average return percentage for completed investments.",
                            },
                            totalPlans: {
                                type: "number",
                                description: "Total number of active investment plans.",
                            },
                            maxProfitPercentage: {
                                type: "number",
                                description: "Maximum profit percentage among all active plans.",
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error." },
    },
};
async function getInvestmentStats() {
    try {
        const activeInvestors = await db_1.models.investment.count({
            distinct: true,
            col: "userId",
            where: { status: { [sequelize_1.Op.in]: ACTIVE_INVESTMENT_STATUS } },
        });
        const totalInvestedRow = await db_1.models.investment.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalInvested"]],
            raw: true,
        });
        const totalInvested = Number((totalInvestedRow === null || totalInvestedRow === void 0 ? void 0 : totalInvestedRow.totalInvested) || 0);
        const avgReturnRow = await db_1.models.investment.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("CASE WHEN amount > 0 AND profit IS NOT NULL THEN ((profit / amount) * 100) ELSE NULL END")),
                    "averageReturn",
                ],
            ],
            where: { status: { [sequelize_1.Op.in]: COMPLETED_INVESTMENT_STATUS } },
            raw: true,
        });
        const averageReturn = Number((avgReturnRow === null || avgReturnRow === void 0 ? void 0 : avgReturnRow.averageReturn) || 0);
        const totalPlans = await db_1.models.investmentPlan.count({
            where: { status: true },
        });
        const maxProfitRow = await db_1.models.investmentPlan.findOne({
            attributes: [[(0, sequelize_1.fn)("MAX", (0, sequelize_1.col)("profitPercentage")), "maxProfitPercentage"]],
            where: { status: true },
            raw: true,
        });
        const maxProfitPercentage = Number((maxProfitRow === null || maxProfitRow === void 0 ? void 0 : maxProfitRow.maxProfitPercentage) || 0);
        return {
            activeInvestors,
            totalInvested,
            averageReturn,
            totalPlans,
            maxProfitPercentage,
        };
    }
    catch (err) {
        console_1.logger.error("INVESTMENT", "Error in getInvestmentStats", err);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
}
