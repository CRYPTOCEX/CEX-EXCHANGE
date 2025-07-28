import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get Trade by ID",
  description: "Retrieves detailed trade data for the given trade ID.",
  operationId: "getP2PTradeById",
  tags: ["P2P", "Trade"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Trade ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Trade retrieved successfully." },
    401: unauthorizedResponse,
    404: { description: "Trade not found." },
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { params?: any; user?: any }) => {
  const { id } = data.params || {};
  const { user } = data;
  if (!user?.id) throw new Error("Unauthorized");
  try {
    const trade = await models.p2pTrade.findOne({
      where: {
        id,
        [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      include: [
        { association: "buyer", attributes: ["id", "name", "email"] },
        { association: "seller", attributes: ["id", "name", "email"] },
        { association: "dispute" },
      ],
    });
    if (!trade) return { error: "Trade not found" };
    return trade.toJSON();
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
