import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Add Admin Note or Message to Trade",
  description: "Adds a note or message to a trade as an admin. Notes are internal, messages are visible to users.",
  operationId: "adminAddNoteToP2PTrade",
  tags: ["Admin", "Trades", "P2P"],
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
  requestBody: {
    description: "Note or message data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            note: { type: "string" },
            isMessage: { type: "boolean", default: false },
          },
          required: ["note"],
        },
      },
    },
  },
  responses: {
    200: { description: "Admin note/message added successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.trade",
};

export default async (data) => {
  const { params, body } = data;
  const { id } = params;
  const { note, isMessage = false } = body;

  try {
    const trade = await models.p2pTrade.findByPk(id, {
      include: [
        {
          model: models.user,
          as: "buyer",
          attributes: ["id", "email"],
        },
        {
          model: models.user,
          as: "seller",
          attributes: ["id", "email"],
        },
      ],
    });
    if (!trade)
      throw createError({ statusCode: 404, message: "Trade not found" });

    // Get admin's name for display
    const admin = await models.user.findByPk(data.user.id, {
      attributes: ["firstName", "lastName"],
    });
    const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "Admin";

    // Parse timeline if it's a string
    let currentTimeline = trade.timeline || [];
    if (typeof currentTimeline === 'string') {
      try {
        currentTimeline = JSON.parse(currentTimeline);
      } catch (e) {
        console.error('Failed to parse timeline JSON:', e);
        currentTimeline = [];
      }
    }

    // Ensure timeline is an array
    if (!Array.isArray(currentTimeline)) {
      currentTimeline = [];
    }

    // Add to timeline with proper formatting
    const timelineEntry = isMessage
      ? {
          event: "MESSAGE",
          message: note,
          senderId: data.user.id,
          senderName: adminName,
          isAdminMessage: true,
          createdAt: new Date().toISOString(),
        }
      : {
          event: "Admin Note",
          message: note,
          details: `Note added by ${adminName}`,
          adminId: data.user.id,
          timestamp: new Date().toISOString(),
        };

    currentTimeline.push(timelineEntry);

    await trade.update({
      timeline: currentTimeline,
    });

    // If it's a message, send notifications to both participants
    if (isMessage) {
      const { notifyTradeEvent } = await import("../../../../p2p/utils/notifications");
      notifyTradeEvent(trade.id, "ADMIN_MESSAGE", {
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        amount: trade.amount,
        currency: trade.currency,
        adminName: adminName,
        message: note,
      }).catch(console.error);
    }

    return {
      message: isMessage
        ? "Admin message sent successfully."
        : "Admin note added successfully."
    };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
