import { models, sequelize } from "@b/db";
import { serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import { fn, literal } from "sequelize";

export const metadata = {
  summary: "Get P2P Market Stats",
  description: "Retrieves aggregated market statistics from P2P trades.",
  operationId: "getP2PMarketStats",
  tags: ["P2P", "Market"],
  logModule: "P2P",
  logTitle: "Get market stats",
  responses: {
    200: { description: "Market stats retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async (data: { ctx?: any }) => {
  const { ctx } = data || {};

  ctx?.step("Calculating market statistics");
  try {
    const stats = await models.p2pTrade.findOne({
      attributes: [
        [fn("COUNT", literal("*")), "totalTrades"],
        [fn("SUM", literal("total")), "totalVolume"],
        [fn("AVG", literal("total")), "avgTradeSize"],
      ],
      raw: true,
    });

    ctx?.success("Market stats retrieved successfully");
    return stats;
  } catch (err: any) {
    ctx?.fail(err.message || "Failed to retrieve market stats");
    throw new Error("Internal Server Error: " + err.message);
  }
};
