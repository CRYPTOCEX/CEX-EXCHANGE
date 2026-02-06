"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Popular Offers",
    description: "Retrieves popular offers ordered by a calculated popularity score based on the number of completed trades (via offerId) and average review ratings from those trades.",
    operationId: "getPopularOffers",
    tags: ["P2P", "Offer"],
    logModule: "P2P",
    logTitle: "Get popular offers",
    parameters: [
        {
            name: "limit",
            in: "query",
            description: "Maximum number of offers to return",
            required: true,
            schema: { type: "integer" },
        },
    ],
    responses: {
        200: { description: "Offers retrieved successfully." },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data = {}) => {
    const { limit } = data.query || {};
    const { ctx } = data || {};
    const parsedLimit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Calculating popularity for top ${parsedLimit} offers`);
    try {
        const query = `
      SELECT
        o.*,
        COUNT(t.id) AS tradeCount,
        AVG((r.communicationRating + r.speedRating + r.trustRating)/3) AS averageRating,
        (COUNT(t.id) * 0.7 + COALESCE(AVG((r.communicationRating + r.speedRating + r.trustRating)/3), 0) * 0.3) AS popularityScore
      FROM p2p_offers o
      LEFT JOIN p2p_trades t ON o.id = t.offerId AND t.status = 'COMPLETED'
      LEFT JOIN p2p_reviews r ON t.id = r.tradeId
      GROUP BY o.id
      ORDER BY popularityScore DESC
      LIMIT :limit
    `;
        const results = await db_1.sequelize.query(query, {
            replacements: { limit: parsedLimit },
            type: sequelize_1.QueryTypes.SELECT,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${results.length} popular offers`);
        return results;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve popular offers");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
