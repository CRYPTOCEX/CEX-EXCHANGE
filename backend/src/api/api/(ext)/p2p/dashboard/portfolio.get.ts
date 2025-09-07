import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get P2P Portfolio Data",
  description: "Retrieves the portfolio summary for the authenticated user.",
  operationId: "getP2PPortfolioData",
  tags: ["P2P", "Dashboard"],
  responses: {
    200: { description: "Portfolio data retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) throw new Error("Unauthorized");
  try {
    const portfolio = await models.p2pTrade.findOne({
      attributes: [
        [
          sequelize.fn("SUM", sequelize.col("total")),
          "totalValue",
        ],
      ],
      where: {
        status: "COMPLETED",
        [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      raw: true,
    });
    return portfolio;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
