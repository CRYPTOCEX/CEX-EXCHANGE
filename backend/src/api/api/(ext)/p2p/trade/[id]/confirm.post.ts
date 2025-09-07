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

export default async (data: { params?: any; user?: any; body?: any }) => {
  const { id } = data.params || {};
  const { user, body } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Import validation utilities
  const { validateTradeStatusTransition } = await import("../../utils/validation");
  const { notifyTradeEvent } = await import("../../utils/notifications");

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
    // Update status and add to timeline
    const timeline = trade.timeline || [];
    timeline.push({
      event: "PAYMENT_CONFIRMED",
      message: "Buyer confirmed payment sent",
      userId: user.id,
      createdAt: new Date().toISOString(),
      paymentReference: body?.paymentReference,
    });

    await trade.update({ 
      status: "PAYMENT_SENT",
      timeline,
      paymentConfirmedAt: new Date(),
    });

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "PAYMENT_CONFIRMED",
      entityId: trade.id,
      entityType: "TRADE",
      metadata: {
        previousStatus: trade.status,
        paymentReference: body?.paymentReference,
      },
    });

    // Send notifications
    notifyTradeEvent(trade.id, "PAYMENT_SENT", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer.currency,
    }).catch(console.error);

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
