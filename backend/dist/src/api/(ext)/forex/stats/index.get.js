"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = getForexStats;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const ACTIVE_INVESTMENT_STATUS = ["ACTIVE", "RUNNING", "OPEN"];
const COMPLETED_INVESTMENT_STATUS = ["COMPLETED", "CLOSED"];
exports.metadata = {
    summary: "Get Forex Platform Statistics",
    description: "Retrieves platform-wide forex stats: number of active investors, total invested amount, average return (completed investments), and number of countries served.",
    operationId: "getForexStats",
    tags: ["Forex", "Stats"],
    logModule: "FOREX",
    logTitle: "Get Forex Stats",
    responses: {
        200: {
            description: "Forex platform statistics retrieved successfully.",
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
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error." },
    },
};
async function getForexStats(data) {
    const { ctx } = data || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing request");
    try {
        const activeInvestors = await db_1.models.forexInvestment.count({
            distinct: true,
            col: "userId",
            where: { status: { [sequelize_1.Op.in]: ACTIVE_INVESTMENT_STATUS } },
        });
        const totalInvestedRow = await db_1.models.forexInvestment.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalInvested"]],
            raw: true,
        });
        const totalInvested = Number((totalInvestedRow === null || totalInvestedRow === void 0 ? void 0 : totalInvestedRow.totalInvested) || 0);
        const avgReturnRow = await db_1.models.forexInvestment.findOne({
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
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
        return {
            activeInvestors,
            totalInvested,
            averageReturn,
        };
    }
    catch (err) {
        console.error("Error in getForexStats:", err);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
}
