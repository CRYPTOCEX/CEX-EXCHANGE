"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get P2P Market Stats",
    description: "Retrieves aggregated market statistics from P2P trades.",
    operationId: "getP2PMarketStats",
    tags: ["P2P", "Market"],
    logModule: "P2P",
    logTitle: "Get market stats",
    responses: {
        200: { description: "Market stats retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { ctx } = data || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating market statistics");
    try {
        const stats = await db_1.models.p2pTrade.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "totalTrades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("total")), "totalVolume"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("total")), "avgTradeSize"],
            ],
            raw: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Market stats retrieved successfully");
        return stats;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve market stats");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
