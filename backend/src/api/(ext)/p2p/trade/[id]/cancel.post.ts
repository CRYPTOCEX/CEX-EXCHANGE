import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Cancel Trade",
  description: "Cancels a trade with a provided cancellation reason.",
  operationId: "cancelP2PTrade",
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
  requestBody: {
    description: "Cancellation reason",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: { type: "string", description: "Reason for cancellation" },
          },
          required: ["reason"],
        },
      },
    },
  },
  responses: {
    200: { description: "Trade cancelled successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; body: any; user?: any }) => {
  const { id } = data.params || {};
  const { reason } = data.body;
  const { user } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Import utilities
  const { validateTradeStatusTransition, sanitizeInput } = await import("../../utils/validation");
  const { notifyTradeEvent } = await import("../../utils/notifications");
  const { sequelize } = await import("@b/db");
  const { getWalletSafe } = await import("@b/api/finance/wallet/utils");

  // Sanitize cancellation reason
  const sanitizedReason = sanitizeInput(reason);
  if (!sanitizedReason || sanitizedReason.length < 10) {
    throw createError({ 
      statusCode: 400, 
      message: "Cancellation reason must be at least 10 characters" 
    });
  }

  const transaction = await sequelize.transaction();

  try {
    // Find and lock trade
    const trade = await models.p2pTrade.findOne({
      where: {
        id,
        [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      include: [{
        model: models.p2pOffer,
        as: "offer",
        attributes: ["currency", "walletType", "id"],
      }],
      lock: true,
      transaction,
    });

    if (!trade) {
      await transaction.rollback();
      throw createError({ statusCode: 404, message: "Trade not found" });
    }

    // Validate status transition
    if (!validateTradeStatusTransition(trade.status, "CANCELLED")) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 400, 
        message: `Cannot cancel trade from status: ${trade.status}` 
      });
    }

    // Check cancellation permissions based on trade status
    if (trade.status === "PAYMENT_SENT" && user.id === trade.buyerId) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 403, 
        message: "Buyer cannot cancel after confirming payment. Please open a dispute instead." 
      });
    }

    // If funds were locked (PENDING or PAYMENT_SENT status), unlock them
    if (["PENDING", "PAYMENT_SENT"].includes(trade.status)) {
      const sellerWallet = await getWalletSafe(
        trade.sellerId,
        trade.offer.walletType,
        trade.offer.currency
      );

      if (sellerWallet && sellerWallet.inOrder >= trade.amount) {
        // Unlock seller's funds
        await sellerWallet.update({
          inOrder: sellerWallet.inOrder - trade.amount,
        }, { transaction });
      }

      // Restore offer amount if applicable
      if (trade.offerId) {
        const offer = await models.p2pOffer.findByPk(trade.offerId, {
          lock: true,
          transaction,
        });

        if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
          await offer.update({
            amountConfig: {
              ...offer.amountConfig,
              total: (offer.amountConfig.total || 0) + trade.amount,
            },
          }, { transaction });
        }
      }
    }

    // Update trade status and timeline
    const timeline = trade.timeline || [];
    timeline.push({
      event: "TRADE_CANCELLED",
      message: `Trade cancelled: ${sanitizedReason}`,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    await trade.update({ 
      status: "CANCELLED",
      cancelledBy: user.id,
      cancellationReason: sanitizedReason,
      cancelledAt: new Date(),
      timeline,
    }, { transaction });

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "TRADE_CANCELLED",
      entityId: trade.id,
      entityType: "TRADE",
      metadata: {
        previousStatus: trade.status,
        reason: sanitizedReason,
        amount: trade.amount,
        currency: trade.offer.currency,
        counterpartyId: user.id === trade.buyerId ? trade.sellerId : trade.buyerId,
      },
    }, { transaction });

    await transaction.commit();

    // Send notifications
    notifyTradeEvent(trade.id, "TRADE_CANCELLED", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer.currency,
      cancelledBy: user.id,
      reason: sanitizedReason,
    }).catch(console.error);

    return { 
      message: "Trade cancelled successfully.",
      trade: {
        id: trade.id,
        status: "CANCELLED",
        cancelledAt: trade.cancelledAt,
        cancellationReason: sanitizedReason,
      }
    };
  } catch (err: any) {
    await transaction.rollback();
    
    if (err.statusCode) {
      throw err;
    }
    
    throw createError({
      statusCode: 500,
      message: "Failed to cancel trade: " + err.message,
    });
  }
};
