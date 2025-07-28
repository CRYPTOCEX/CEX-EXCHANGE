import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Release Funds for Trade",
  description:
    "Releases funds and updates the trade status to 'COMPLETED' for the authenticated seller.",
  operationId: "releaseP2PTradeFunds",
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
  responses: {
    200: { description: "Funds released successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; user?: any }) => {
  const { id } = data.params || {};
  const { user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });
  const trade = await models.p2pTrade.findOne({
    where: { id, sellerId: user.id },
  });
  if (!trade) {
    throw createError({ statusCode: 404, message: "Trade not found" });
  }
  try {
    await trade.update({ status: "COMPLETED" });
    return { message: "Funds released successfully." };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
