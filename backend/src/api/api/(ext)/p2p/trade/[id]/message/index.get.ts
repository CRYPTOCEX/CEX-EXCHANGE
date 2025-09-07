import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get Trade Messages",
  description:
    "Retrieves messages (stored in timeline) for the specified trade.",
  operationId: "getP2PTradeMessages",
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
    200: { description: "Trade messages retrieved successfully." },
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
      raw: true,
    });
    if (!trade) return { error: "Trade not found" };
    const messages = trade.timeline || [];
    return messages;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
