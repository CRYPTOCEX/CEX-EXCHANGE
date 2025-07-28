import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Confirm Payment for Trade",
  description:
    "Updates the trade status to 'PAYMENT_SENT' to confirm that payment has been made.",
  operationId: "confirmP2PTradePayment",
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
    200: { description: "Payment confirmed successfully." },
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
    where: { id, buyerId: user.id },
  });
  if (!trade) {
    throw createError({ statusCode: 404, message: "Trade not found" });
  }
  try {
    await trade.update({ status: "PAYMENT_SENT" });
    return { message: "Payment confirmed successfully." };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
