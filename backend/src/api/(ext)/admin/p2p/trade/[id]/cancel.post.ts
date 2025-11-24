import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Cancel Trade (Admin)",
  description: "Cancels a trade with a provided cancellation reason.",
  operationId: "cancelAdminP2PTrade",
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
  requestBody: {
    description: "Cancellation reason",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: { type: "string" },
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
  permission: "edit.p2p.trade",
};

export default async (data) => {
  const { params, body } = data;
  const { id } = params;
  const { reason } = body;

  try {
    const trade = await models.p2pTrade.findByPk(id);
    if (!trade)
      throw createError({ statusCode: 404, message: "Trade not found" });
    await trade.update({ status: "CANCELLED", terms: reason });
    return { message: "Trade cancelled successfully." };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
