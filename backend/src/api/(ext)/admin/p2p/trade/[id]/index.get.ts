import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get P2P Trade Details (Admin)",
  description: "Retrieves detailed information about a specific trade.",
  operationId: "getAdminP2PTradeById",
  tags: ["Admin", "Trades", "P2P"],
  requiresAuth: true,
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
    200: { description: "Trade details retrieved successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.p2p.trade",
};

export default async (data) => {
  const { params } = data;
  const { id } = params;

  try {
    const trade = await models.p2pTrade.findByPk(id, {
      include: [
        {
          association: "buyer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          association: "seller",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });
    if (!trade)
      throw createError({ statusCode: 404, message: "Trade not found" });
    return trade.toJSON();
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
