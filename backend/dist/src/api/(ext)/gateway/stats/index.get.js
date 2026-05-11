"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Retrieves gateway statistics",
    description: "Fetches public statistics for the payment gateway including total merchants, transactions, volume, and success rate.",
    operationId: "getGatewayStats",
    tags: ["Gateway", "Stats"],
    logModule: "GATEWAY",
    logTitle: "Get Public Stats",
    responses: {
        200: {
            description: "Gateway stats retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalMerchants: {
                                type: "number",
                                description: "Total number of registered merchants",
                            },
                            totalTransactions: {
                                type: "number",
                                description: "Total number of completed transactions",
                            },
                            totalVolume: {
                                type: "number",
                                description: "Total volume processed in millions",
                            },
                            successRate: {
                                type: "number",
                                description: "Success rate percentage",
                            },
                        },
                        required: ["totalMerchants", "totalTransactions", "totalVolume", "successRate"],
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Gateway Stats");
    try {
        const [totalMerchantsCount, totalTransactionsCount, successfulTransactionsCount, totalVolumeResult,] = await Promise.all([
            db_1.models.gatewayMerchant.count(),
            db_1.models.gatewayPayment.count(),
            db_1.models.gatewayPayment.count({
                where: { status: "COMPLETED" },
            }),
            db_1.models.gatewayPayment.findOne({
                attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
                where: { status: "COMPLETED" },
                raw: true,
            }),
        ]);
        const totalVolume = parseFloat((totalVolumeResult === null || totalVolumeResult === void 0 ? void 0 : totalVolumeResult.total) || "0") || 0;
        const successRate = totalTransactionsCount > 0
            ? Math.round((successfulTransactionsCount / totalTransactionsCount) * 100)
            : 0;
        const stats = {
            totalMerchants: totalMerchantsCount,
            totalTransactions: totalTransactionsCount,
            totalVolume: Math.round(totalVolume / 1000000 * 100) / 100,
            successRate,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Stats fetched: ${stats.totalMerchants} merchants, ${stats.totalTransactions} transactions`);
        return stats;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error retrieving gateway stats: ${error.message}`,
        });
    }
};
