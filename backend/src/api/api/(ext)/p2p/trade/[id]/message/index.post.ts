import { models } from "@b/db";
import { Op, fn } from "sequelize";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Send Trade Message",
  description: "Sends a message within a trade (appended to the timeline).",
  operationId: "sendP2PTradeMessage",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  middleware: ["p2pMessageRateLimit"],
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

export default async (data: { params?: any; body: any; user?: any }) => {
  const { id } = data.params || {};
  const { message } = data.body;
  const { user } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Import validation utilities
  const { validateMessage } = await import("../../../utils/validation");
  const { notifyTradeEvent } = await import("../../../utils/notifications");

  // Validate and sanitize message
  const sanitizedMessage = validateMessage(message);

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
    const timeline = trade.timeline || [];
    const messageEntry = {
      event: "MESSAGE",
      message: sanitizedMessage,
      senderId: user.id,
      senderName: user.firstName || "User",
      createdAt: new Date().toISOString(),
      id: fn('uuid_generate_v4'), // Generate unique ID for message
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
      entityId: trade.id,
      entityType: "TRADE",
      metadata: {
        messageLength: sanitizedMessage.length,
        recipientId: user.id === trade.buyerId ? trade.sellerId : trade.buyerId,
      },
    });

    // Send notification to the other party (non-blocking)
    notifyTradeEvent(trade.id, "TRADE_MESSAGE", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer.currency,
      senderId: user.id,
    }).catch(console.error);

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
