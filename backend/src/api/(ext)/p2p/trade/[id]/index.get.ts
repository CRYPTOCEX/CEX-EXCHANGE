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
    // First check if the trade exists at all
    const tradeExists = await models.p2pTrade.findOne({
      where: { id },
      attributes: ['id', 'buyerId', 'sellerId'],
    });

    if (!tradeExists) {
      throw new Error("Trade not found");
    }

    // Check if user has access to this trade
    const isParticipant =
      tradeExists.buyerId === user.id ||
      tradeExists.sellerId === user.id;

    if (!isParticipant) {
      throw new Error("You don't have permission to view this trade");
    }

    // Now fetch the full trade data
    const trade = await models.p2pTrade.findOne({
      where: { id },
      include: [
        { association: "buyer", attributes: ["id", "firstName", "lastName", "email", "avatar"] },
        { association: "seller", attributes: ["id", "firstName", "lastName", "email", "avatar"] },
        { association: "dispute" },
        {
          association: "paymentMethodDetails",
          attributes: ["id", "name", "icon", "processingTime", "instructions"],
          required: false
        },
        {
          association: "offer",
          attributes: ["id", "currency", "priceCurrency", "walletType", "type"],
          required: false
        },
      ],
    });

    if (!trade) {
      throw new Error("Trade not found");
    }

    // Transform the trade data to include formatted names
    const tradeData = trade.toJSON();
    if (tradeData.buyer) {
      tradeData.buyer.name = `${tradeData.buyer.firstName || ''} ${tradeData.buyer.lastName || ''}`.trim();
    }
    if (tradeData.seller) {
      tradeData.seller.name = `${tradeData.seller.firstName || ''} ${tradeData.seller.lastName || ''}`.trim();
    }

    return tradeData;
  } catch (err: any) {
    throw new Error(err.message || "Internal Server Error");
  }
};
