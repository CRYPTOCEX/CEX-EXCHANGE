import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminTradeRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";

export const metadata = {
  summary: "Resolve Trade (Admin)",
  description:
    "Resolves a trade by updating its status to 'COMPLETED' with resolution details.",
  operationId: "resolveAdminP2PTrade",
  tags: ["Admin", "Trades", "P2P"],
  requiresAuth: true,
  middleware: [p2pAdminTradeRateLimit],
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
    description: "Resolution details",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            resolution: { type: "string" },
            notes: { type: "string" },
          },
          required: ["resolution"],
        },
      },
    },
  },
  responses: {
    200: { description: "Trade resolved successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "Access P2P Management",
};

export default async (data) => {
  const { params, body } = data;
  const { id } = params;
  const { resolution, notes } = body;

  try {
    const trade = await models.p2pTrade.findByPk(id);
    if (!trade)
      throw createError({ statusCode: 404, message: "Trade not found" });
    await trade.update({
      status: "COMPLETED",
      resolution: { resolution, notes },
      paymentConfirmedAt: new Date(),
    });
    return { message: "Trade resolved successfully." };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
