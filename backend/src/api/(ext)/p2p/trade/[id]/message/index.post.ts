import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Send Trade Message",
  description: "Sends a message within a trade (appended to the timeline).",
  operationId: "sendP2PTradeMessage",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  middleware: ["p2pMessageRateLimit"],
  logModule: "P2P_MESSAGE",
  logTitle: "Send trade message",
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
    description: "Message payload",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
      },
    },
  },
  responses: {
    200: { description: "Message sent successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; body: any; user?: any; ctx?: any }) => {
  const { id } = data.params || {};
  const { message } = data.body;
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating message content");
  // Import validation utilities
  const { validateMessage } = await import("../../../utils/validation");
  const { notifyTradeEvent } = await import("../../../utils/notifications");
  const { broadcastP2PTradeEvent } = await import("../index.ws");

  // Validate and sanitize message
  const sanitizedMessage = validateMessage(message);

  ctx?.step("Finding trade and checking permissions");
  const trade = await models.p2pTrade.findOne({
    where: {
      id,
      [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    include: [{
      model: models.p2pOffer,
      as: "offer",
      attributes: ["currency"],
    }],
  });

  if (!trade) {
    throw createError({ statusCode: 404, message: "Trade not found" });
  }

  // Check if trade is in a state where messages are allowed
  const disallowedStatuses = ["COMPLETED", "CANCELLED", "EXPIRED"];
  if (disallowedStatuses.includes(trade.status)) {
    throw createError({ 
      statusCode: 400, 
      message: `Cannot send messages on ${trade.status.toLowerCase()} trades` 
    });
  }

  try {
    ctx?.step("Adding message to trade timeline");
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

    // Ensure timeline is an array
    if (!Array.isArray(timeline)) {
      timeline = [];
    }

    const messageEntry = {
      id: uuidv4(), // Generate unique ID for message
      event: "MESSAGE",
      message: sanitizedMessage,
      senderId: user.id,
      senderName: user.firstName || "User",
      createdAt: new Date().toISOString(),
    };

    timeline.push(messageEntry);

    // Update trade with new message
    await trade.update({
      timeline,
      lastMessageAt: new Date(),
    });

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "MESSAGE_SENT",
      action: "MESSAGE_SENT",
      relatedEntity: "TRADE",
      relatedEntityId: trade.id,
      details: JSON.stringify({
        messageLength: sanitizedMessage.length,
        recipientId: user.id === trade.buyerId ? trade.sellerId : trade.buyerId,
        timestamp: new Date().toISOString(),
      }),
    });

    // Send notification to the other party (non-blocking)
    notifyTradeEvent(trade.id, "TRADE_MESSAGE", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer.currency,
      senderId: user.id,
    }).catch(console.error);

    // Broadcast WebSocket event for real-time message updates
    broadcastP2PTradeEvent(trade.id, {
      type: "MESSAGE",
      data: {
        id: messageEntry.id,
        message: sanitizedMessage,
        senderId: user.id,
        senderName: messageEntry.senderName,
        createdAt: messageEntry.createdAt,
      },
    });

    ctx?.success(`Sent message in trade ${trade.id.slice(0, 8)}...`);

    return {
      message: "Message sent successfully.",
      data: {
        id: messageEntry.id,
        message: sanitizedMessage,
        createdAt: messageEntry.createdAt,
        senderId: user.id,
        senderName: messageEntry.senderName,
      }
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    
    throw createError({
      statusCode: 500,
      message: "Failed to send message: " + err.message,
    });
  }
};
