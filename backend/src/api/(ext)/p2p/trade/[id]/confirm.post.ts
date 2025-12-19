import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Confirm Payment for Trade",
  description:
    "Updates the trade status to 'PAYMENT_SENT' to confirm that payment has been made.",
  operationId: "confirmP2PTradePayment",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  logModule: "P2P_TRADE",
  logTitle: "Confirm payment",
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

export default async (data: { params?: any; user?: any; body?: any; ctx?: any }) => {
  const { id } = data.params || {};
  const { user, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Finding and validating trade");
  // Import validation utilities
  const { validateTradeStatusTransition } = await import("../../utils/validation");
  const { notifyTradeEvent } = await import("../../utils/notifications");
  const { broadcastP2PTradeEvent } = await import("./index.ws");

  const trade = await models.p2pTrade.findOne({
    where: { id, buyerId: user.id },
    include: [{
      model: models.p2pOffer,
      as: "offer",
      attributes: ["currency"],
    }],
  });

  if (!trade) {
    throw createError({ statusCode: 404, message: "Trade not found" });
  }

  // Validate status transition
  if (!validateTradeStatusTransition(trade.status, "PAYMENT_SENT")) {
    throw createError({ 
      statusCode: 400, 
      message: `Cannot confirm payment from status: ${trade.status}` 
    });
  }

  // Check if trade is expired
  if (trade.expiresAt && new Date(trade.expiresAt) < new Date()) {
    throw createError({ 
      statusCode: 400, 
      message: "Trade has expired" 
    });
  }

  try {
    ctx?.step("Updating trade status to PAYMENT_SENT");
    // Parse timeline if it's a string
    let timeline = trade.timeline || [];
    if (typeof timeline === "string") {
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

    timeline.push({
      event: "PAYMENT_CONFIRMED",
      message: "Buyer confirmed payment sent",
      userId: user.id,
      createdAt: new Date().toISOString(),
      paymentReference: body?.paymentReference,
    });

    const previousStatus = trade.status;

    await trade.update({
      status: "PAYMENT_SENT",
      timeline,
      paymentConfirmedAt: new Date(),
    });

    // Reload to verify update was successful
    await trade.reload();

    if (trade.status !== "PAYMENT_SENT") {
      logger.error("P2P_TRADE", `Status update failed! Expected PAYMENT_SENT, got ${trade.status}`);
      throw createError({
        statusCode: 500,
        message: "Failed to update trade status"
      });
    }

    logger.info("P2P_TRADE", `Trade ${trade.id} status updated: ${previousStatus} -> ${trade.status}`);

    ctx?.step("Logging activity and sending notifications");
    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "PAYMENT_CONFIRMED",
      action: "PAYMENT_CONFIRMED",
      relatedEntity: "TRADE",
      relatedEntityId: trade.id,
      details: JSON.stringify({
        previousStatus,
        newStatus: trade.status,
        paymentReference: body?.paymentReference,
      }),
    });

    // Send notifications (use PAYMENT_CONFIRMED to match the notification handler)
    notifyTradeEvent(trade.id, "PAYMENT_CONFIRMED", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer.currency,
    }).catch(console.error);

    // Broadcast WebSocket event for real-time updates
    broadcastP2PTradeEvent(trade.id, {
      type: "STATUS_CHANGE",
      data: {
        status: "PAYMENT_SENT",
        previousStatus: "PENDING",
        paymentConfirmedAt: trade.paymentConfirmedAt,
        timeline,
      },
    });

    ctx?.success(`Payment confirmed for trade ${trade.id.slice(0, 8)}... (${trade.amount} ${trade.offer.currency})`);

    return {
      message: "Payment confirmed successfully.",
      trade: {
        id: trade.id,
        status: trade.status,
        paymentConfirmedAt: trade.paymentConfirmedAt,
      }
    };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Failed to confirm payment: " + err.message,
    });
  }
};
