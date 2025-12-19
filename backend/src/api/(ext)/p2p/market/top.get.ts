import { models } from "@b/db";
import { serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import { fn, literal } from "sequelize";

export const metadata = {
  summary: "Get Top Cryptocurrencies in P2P",
  description:
    "Retrieves the top cryptocurrencies based on trade volume aggregations.",
  operationId: "getP2PTopCryptos",
  tags: ["P2P", "Market"],
  logModule: "P2P",
  logTitle: "Get top cryptocurrencies",
  responses: {
    200: { description: "Top cryptocurrencies retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async (data: { ctx?: any }) => {
  const { ctx } = data || {};

  ctx?.step("Calculating top cryptocurrencies");
  try {
    const topCryptos = await models.p2pTrade.findAll({
      attributes: ["currency", [fn("SUM", literal("total")), "totalVolume"]],
      group: ["currency"],
      order: [[literal("totalVolume"), "DESC"]],
      limit: 5,
      raw: true,
    });

    ctx?.success(`Retrieved ${topCryptos.length} top cryptocurrencies`);
    return topCryptos;
  } catch (err: any) {
    ctx?.fail(err.message || "Failed to retrieve top cryptocurrencies");
    throw new Error("Internal Server Error: " + err.message);
  }
};
