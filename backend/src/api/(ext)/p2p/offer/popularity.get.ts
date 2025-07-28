import { models, sequelize } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";
import { QueryTypes } from "sequelize";

export const metadata = {
  summary: "Get Popular Offers",
  description:
    "Retrieves popular offers ordered by a calculated popularity score based on the number of completed trades (via offerId) and average review ratings from those trades.",
  operationId: "getPopularOffers",
  tags: ["P2P", "Offer"],
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
    500: serverErrorResponse,
  },
};

export default async (data: { query?: any } = {}) => {
  const { limit } = data.query || {};
  const parsedLimit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;

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

    const results = await sequelize.query(query, {
      replacements: { limit: parsedLimit },
      type: QueryTypes.SELECT,
    });

    return results;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
