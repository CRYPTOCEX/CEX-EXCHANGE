import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get Trade by ID",
  description: "Retrieves detailed trade data for the given trade ID.",
  operationId: "getP2PTradeById",
  tags: ["P2P", "Trade"],
  logModule: "P2P",
  logTitle: "Get trade by ID",
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

export default async (data: { params?: any; user?: any; ctx?: any }) => {
  const { id } = data.params || {};
  const { user, ctx } = data;
  if (!user?.id) throw new Error("Unauthorized");

  ctx?.step("Verifying trade access");
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

    ctx?.step("Fetching trade details with counterparty info");
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
          attributes: ["id", "currency", "priceCurrency", "walletType", "type", "tradeSettings"],
          required: false
        },
      ],
    });

    if (!trade) {
      throw new Error("Trade not found");
    }

    // Transform the trade data to include formatted names and stats
    const tradeData = trade.toJSON();

    // Get counterparty stats for both buyer and seller
    const getCounterpartyStats = async (userId: string) => {
      const totalTrades = await models.p2pTrade.count({
        where: {
          [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
          status: { [Op.in]: ["COMPLETED", "DISPUTE_RESOLVED", "CANCELLED", "EXPIRED"] },
        },
      });

      const completedTrades = await models.p2pTrade.count({
        where: {
          [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
          status: "COMPLETED",
        },
      });

      const completionRate = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 100;

      return { completedTrades, completionRate };
    };

    if (tradeData.buyer) {
      tradeData.buyer.name = `${tradeData.buyer.firstName || ''} ${tradeData.buyer.lastName || ''}`.trim();
      const buyerStats = await getCounterpartyStats(tradeData.buyer.id);
      tradeData.buyer.completedTrades = buyerStats.completedTrades;
      tradeData.buyer.completionRate = buyerStats.completionRate;
    }
    if (tradeData.seller) {
      tradeData.seller.name = `${tradeData.seller.firstName || ''} ${tradeData.seller.lastName || ''}`.trim();
      const sellerStats = await getCounterpartyStats(tradeData.seller.id);
      tradeData.seller.completedTrades = sellerStats.completedTrades;
      tradeData.seller.completionRate = sellerStats.completionRate;
    }

    // Parse JSON fields that may come as strings
    if (tradeData.paymentDetails && typeof tradeData.paymentDetails === "string") {
      try {
        tradeData.paymentDetails = JSON.parse(tradeData.paymentDetails);
      } catch {
        // Keep as is if parsing fails
      }
    }

    if (tradeData.timeline && typeof tradeData.timeline === "string") {
      try {
        tradeData.timeline = JSON.parse(tradeData.timeline);
      } catch {
        // Keep as is if parsing fails
      }
    }

    if (tradeData.offer?.tradeSettings && typeof tradeData.offer.tradeSettings === "string") {
      try {
        tradeData.offer.tradeSettings = JSON.parse(tradeData.offer.tradeSettings);
      } catch {
        // Keep as is if parsing fails
      }
    }

    // Add payment window from offer settings or platform default
    const { CacheManager } = await import("@b/utils/cache");
    const cacheManager = CacheManager.getInstance();
    const defaultPaymentWindow = await cacheManager.getSetting("p2pDefaultPaymentWindow") || 240;
    tradeData.paymentWindow = tradeData.offer?.tradeSettings?.autoCancel ||
      tradeData.offer?.tradeSettings?.paymentWindow ||
      defaultPaymentWindow;

    ctx?.success(`Retrieved trade ${id.slice(0, 8)}... (${tradeData.status})`);
    return tradeData;
  } catch (err: any) {
    ctx?.fail(err.message || "Failed to retrieve trade");
    throw new Error(err.message || "Internal Server Error");
  }
};
