import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Get P2P Trade Details (Admin)",
  description: "Retrieves detailed information about a specific trade.",
  operationId: "getAdminP2PTradeById",
  tags: ["Admin", "Trades", "P2P"],
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Get P2P Trade",
  demoMask: ["buyer.email", "seller.email"],
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
  const { params, ctx } = data;
  const { id } = params;

  try {
    ctx?.step("Fetching data");
    const trade = await models.p2pTrade.findByPk(id, {
      include: [
        {
          association: "buyer",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          association: "seller",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          association: "offer",
          attributes: ["id", "type", "currency", "amountConfig", "priceConfig"],
        },
        {
          association: "dispute",
        },
        {
          association: "paymentMethodDetails",
          attributes: ["id", "name", "instructions", "icon"],
        },
      ],
    });
    if (!trade)
      throw createError({ statusCode: 404, message: "Trade not found" });

    // Format the trade data to match frontend expectations
    const tradeData = trade.toJSON();

    // Helper function to get user initials
    const getInitials = (user: any) => {
      if (!user) return "?";
      const first = user.firstName?.charAt(0) || "";
      const last = user.lastName?.charAt(0) || "";
      return (first + last).toUpperCase() || "?";
    };

    // Helper function to get full name
    const getFullName = (user: any) => {
      if (!user) return "Unknown";
      return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
    };

    // Parse and format timeline events if they exist
    let timelineData = tradeData.timeline;

    // If timeline is a string, parse it
    if (typeof timelineData === 'string') {
      try {
        timelineData = JSON.parse(timelineData);
      } catch (e) {
        logger.error("P2P", "Failed to parse timeline JSON", e);
        timelineData = [];
      }
    }

    // Ensure it's an array
    if (!Array.isArray(timelineData)) {
      timelineData = [];
    }

    // Filter out MESSAGE events from timeline - they go to messages tab
    const formattedTimeline = timelineData
      .filter((event: any) => {
        const eventType = event.event || event.type || "";
        return eventType !== "MESSAGE";
      })
      .map((event: any) => {
        const eventType = event.event || event.type || "Event";
        // Format event type for display
        const formattedEvent = eventType
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase());

        return {
          event: formattedEvent,
          type: eventType, // Keep original type for icon matching
          timestamp: event.timestamp || event.createdAt || new Date().toISOString(),
          details: event.message || event.details || "",
          userId: event.userId || null,
          adminName: event.adminName || null,
        };
      });

    // Extract chat messages from timeline (events with type "MESSAGE")
    const formattedMessages = timelineData
      .filter((event: any) => event.event === "MESSAGE" || event.type === "MESSAGE")
      .map((event: any) => {
        // Determine sender information
        let senderName = event.senderName || "Unknown";
        let avatar = null;
        let isAdmin = event.isAdminMessage || false;

        // Get sender details from buyer/seller if senderId matches
        if (event.senderId === tradeData.buyer?.id) {
          senderName = getFullName(tradeData.buyer);
          avatar = tradeData.buyer?.avatar;
        } else if (event.senderId === tradeData.seller?.id) {
          senderName = getFullName(tradeData.seller);
          avatar = tradeData.seller?.avatar;
        } else if (event.senderName) {
          senderName = event.senderName;
        }

        return {
          id: event.id || `msg-${event.createdAt || Date.now()}`,
          sender: senderName,
          senderId: event.senderId || null,
          content: event.message || event.details || "",
          timestamp: new Date(event.createdAt || event.timestamp).toLocaleString(),
          avatar: avatar,
          isAdmin: isAdmin,
          attachments: event.attachments || [],
        };
      });

    // Extract dispute info if present
    const disputeData = tradeData.dispute || null;

    ctx?.success("Trade details retrieved successfully");
    return {
      ...tradeData,
      crypto: tradeData.currency,
      fiatValue: tradeData.total ? `${tradeData.total} ${tradeData.priceCurrency || 'USD'}` : "N/A",
      escrowFee: tradeData.escrowFee || "0",
      timeRemaining: tradeData.expiresAt ? calculateTimeRemaining(new Date(tradeData.expiresAt)) : null,
      buyer: {
        id: tradeData.buyer?.id,
        name: getFullName(tradeData.buyer),
        initials: getInitials(tradeData.buyer),
        avatar: tradeData.buyer?.avatar,
        email: tradeData.buyer?.email,
      },
      seller: {
        id: tradeData.seller?.id,
        name: getFullName(tradeData.seller),
        initials: getInitials(tradeData.seller),
        avatar: tradeData.seller?.avatar,
        email: tradeData.seller?.email,
      },
      timeline: formattedTimeline,
      messages: formattedMessages,
      // Add dispute info from the associated dispute record
      disputeId: disputeData?.id || null,
      disputeReason: disputeData?.reason || null,
      disputeDetails: disputeData?.details || null,
      disputeEvidence: disputeData?.evidence || null,
      disputeFiledBy: disputeData?.reportedById || null,
    };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};

// Helper function to calculate time remaining
function calculateTimeRemaining(expiresAt: Date): string | null {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
