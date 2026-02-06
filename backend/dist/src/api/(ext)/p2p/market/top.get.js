"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Top Cryptocurrencies in P2P",
    description: "Retrieves the top cryptocurrencies based on trade volume aggregations.",
    operationId: "getP2PTopCryptos",
    tags: ["P2P", "Market"],
    logModule: "P2P",
    logTitle: "Get top cryptocurrencies",
    responses: {
        200: { description: "Top cryptocurrencies retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { ctx } = data || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating top cryptocurrencies");
    try {
        const topCryptos = await db_1.models.p2pTrade.findAll({
            attributes: ["currency", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("total")), "totalVolume"]],
            group: ["currency"],
            order: [[(0, sequelize_1.literal)("totalVolume"), "DESC"]],
            limit: 5,
            raw: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${topCryptos.length} top cryptocurrencies`);
        return topCryptos;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve top cryptocurrencies");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
