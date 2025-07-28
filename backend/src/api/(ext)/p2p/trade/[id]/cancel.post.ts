import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Cancel Trade",
  description: "Cancels a trade with a provided cancellation reason.",
  operationId: "cancelP2PTrade",
  tags: ["P2P", "Trade"],
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
  requestBody: {
    description: "Cancellation reason",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: { type: "string", description: "Reason for cancellation" },
          },
          required: ["reason"],
        },
      },
    },
  },
  responses: {
    200: { description: "Trade cancelled successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; body: any; user?: any }) => {
  const { id } = data.params || {};
  const { reason } = data.body;
  const { user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });
  const trade = await models.p2pTrade.findOne({
    where: {
      id,
      [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
    },
  });
  if (!trade) {
    throw createError({ statusCode: 404, message: "Trade not found" });
  }
  try {
    await trade.update({ status: "CANCELLED", terms: reason });
    return { message: "Trade cancelled successfully." };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
