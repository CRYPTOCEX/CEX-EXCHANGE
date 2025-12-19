import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Get Trade Messages",
  description:
    "Retrieves messages (stored in timeline) for the specified trade.",
  operationId: "getP2PTradeMessages",
  tags: ["P2P", "Trade"],
  logModule: "P2P",
  logTitle: "Get trade messages",
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

export default async (data: { params?: any; user?: any; ctx?: any }) => {
  const { id } = data.params || {};
  const { user, ctx } = data;
  if (!user?.id) throw new Error("Unauthorized");

  ctx?.step("Fetching trade messages");
  try {
    const trade = await models.p2pTrade.findOne({
      where: {
        id,
        [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      raw: true,
    });
    if (!trade) return { error: "Trade not found" };

    // Parse timeline if it's a string
    let timeline = trade.timeline || [];
    if (typeof timeline === 'string') {
      try {
        timeline = JSON.parse(timeline);
      } catch (e) {
        logger.error("P2P_TRADE", "Failed to parse timeline JSON", e);
        timeline = [];
      }
    }

    // Filter only MESSAGE events from timeline
    const messages = Array.isArray(timeline)
      ? timeline
          .filter((entry: any) => entry.event === "MESSAGE")
          .map((entry: any) => ({
            id: entry.id || entry.createdAt,
            message: entry.message,
            senderId: entry.senderId,
            senderName: entry.senderName || "User",
            isAdminMessage: entry.isAdminMessage || false,
            createdAt: entry.createdAt,
          }))
      : [];

    ctx?.success(`Retrieved ${messages.length} messages for trade ${id.slice(0, 8)}...`);
    return messages;
  } catch (err: any) {
    ctx?.fail(err.message || "Failed to retrieve trade messages");
    throw new Error("Internal Server Error: " + err.message);
  }
};
