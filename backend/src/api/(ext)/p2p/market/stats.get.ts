import { models, sequelize } from "@b/db";
import { serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import { fn, literal } from "sequelize";

export const metadata = {
  summary: "Get P2P Market Stats",
  description: "Retrieves aggregated market statistics from P2P trades.",
  operationId: "getP2PMarketStats",
  tags: ["P2P", "Market"],
  responses: {
    200: { description: "Market stats retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async () => {
  try {
    const stats = await models.p2pTrade.findOne({
      attributes: [
        [fn("COUNT", literal("*")), "totalTrades"],
        [fn("SUM", literal("total")), "totalVolume"],
        [fn("AVG", literal("total")), "avgTradeSize"],
      ],
      raw: true,
    });
    return stats;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
