import { models, sequelize } from "@b/db";
import { serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import { fn, literal } from "sequelize";

export const metadata = {
  summary: "Get Top Cryptocurrencies in P2P",
  description:
    "Retrieves the top cryptocurrencies based on trade volume aggregations.",
  operationId: "getP2PTopCryptos",
  tags: ["P2P", "Market"],
  responses: {
    200: { description: "Top cryptocurrencies retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async () => {
  try {
    const topCryptos = await models.p2pTrade.findAll({
      attributes: ["currency", [fn("SUM", literal("total")), "totalVolume"]],
      group: ["currency"],
      order: [[sequelize.literal("totalVolume"), "DESC"]],
      limit: 5,
      raw: true,
    });
    return topCryptos;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
