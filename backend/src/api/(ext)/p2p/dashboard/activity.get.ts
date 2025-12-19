import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get P2P Trading Activity",
  description:
    "Retrieves recent trading activity for the authenticated user.",
  operationId: "getP2PTradingActivity",
  tags: ["P2P", "Dashboard"],
  logModule: "P2P",
  logTitle: "Get trading activity",
  responses: {
    200: { description: "Trading activity retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any; ctx?: any }) => {
  const { user, ctx } = data;
  if (!user?.id) throw new Error("Unauthorized");

  ctx?.step("Fetching recent trades");
  try {
    // Fetch trades directly instead of activity logs (which may be empty)
    const trades = await models.p2pTrade.findAll({
      where: {
        [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      include: [
        {
          model: models.p2pOffer,
          as: "offer",
          attributes: ["currency"],
        },
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethodDetails",
          attributes: ["name"],
        },
      ],
      order: [["updatedAt", "DESC"]],
      limit: 10,
    });

    // Transform trades into activity format
    const activities = trades.map((trade: any) => {
      const tradeData = trade.get({ plain: true });
      const isBuyer = tradeData.buyerId === user.id;
      const actionType = isBuyer ? "BUY" : "SELL";

      return {
        id: tradeData.id,
        type: actionType,
        status: tradeData.status,
        amount: tradeData.amount,
        currency: tradeData.currency || tradeData.offer?.currency || "Unknown",
        total: tradeData.total,
        paymentMethodName: tradeData.paymentMethodDetails?.name || "Unknown",
        counterpartyId: isBuyer ? tradeData.sellerId : tradeData.buyerId,
        timestamp: tradeData.updatedAt,
        createdAt: tradeData.createdAt,
      };
    });

    ctx?.success(`Retrieved ${activities.length} activity records`);
    return activities;
  } catch (err: any) {
    ctx?.fail(err.message || "Failed to retrieve trading activity");
    throw new Error("Internal Server Error: " + err.message);
  }
};
