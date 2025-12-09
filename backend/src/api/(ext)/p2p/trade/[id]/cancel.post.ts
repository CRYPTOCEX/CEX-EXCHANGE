import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";
import { parseAmountConfig } from "@b/api/(ext)/p2p/utils/json-parser";

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
  const { broadcastP2PTradeEvent } = await import("./index.ws");
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
        attributes: ["currency", "walletType", "id", "type"],
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

    // Handle fund unlocking and offer restoration based on offer type
    // - For SELL offers: Funds were locked at offer creation, stay locked until offer is deleted
    //                    Only restore offer amount, don't unlock wallet inOrder
    // - For BUY offers: Funds were locked at trade initiation, need to unlock on cancel
    if (["PENDING", "PAYMENT_SENT"].includes(trade.status)) {
      const isBuyOffer = trade.offer.type === "BUY";

      // Only unlock wallet inOrder for BUY offers (funds were locked at trade initiation)
      if (isBuyOffer) {
        const sellerWallet = await getWalletSafe(
          trade.sellerId,
          trade.offer.walletType,
          trade.offer.currency
        );

        if (sellerWallet) {
          // CRITICAL: Calculate safe unlock amount to prevent negative inOrder
          const safeUnlockAmount = Math.min(trade.amount, sellerWallet.inOrder);

          if (safeUnlockAmount > 0) {
            // Store old value before update for logging
            const previousInOrder = sellerWallet.inOrder;
            const newInOrder = Math.max(0, sellerWallet.inOrder - safeUnlockAmount);

            // Unlock seller's funds
            await models.wallet.update({
              inOrder: newInOrder,
            }, {
              where: { id: sellerWallet.id },
              transaction
            });

            console.log('[P2P Trade Cancel] Unlocked funds (BUY offer):', {
              sellerId: trade.sellerId,
              walletType: trade.offer.walletType,
              currency: trade.offer.currency,
              requestedAmount: trade.amount,
              actualUnlocked: safeUnlockAmount,
              previousInOrder: previousInOrder,
              newInOrder: newInOrder,
            });

            // Log warning if amounts don't match (indicates potential double-processing)
            if (safeUnlockAmount < trade.amount) {
              console.warn('[P2P Trade Cancel] WARNING: Partial unlock - inOrder was less than trade amount:', {
                tradeId: trade.id,
                tradeAmount: trade.amount,
                availableInOrder: sellerWallet.inOrder,
                actualUnlocked: safeUnlockAmount,
              });
            }
          } else {
            console.warn('[P2P Trade Cancel] WARNING: No funds to unlock - inOrder is already 0:', {
              tradeId: trade.id,
              tradeAmount: trade.amount,
              currentInOrder: sellerWallet.inOrder,
            });
          }
        }
      } else {
        // For SELL offers: Don't unlock wallet inOrder, funds stay locked for the offer
        console.log('[P2P Trade Cancel] SELL offer - funds remain locked for offer:', {
          tradeId: trade.id,
          offerId: trade.offerId,
          amount: trade.amount,
          currency: trade.offer.currency,
        });
      }

      // Restore offer amount if applicable (for both SELL and BUY offers)
      // This makes the amount available for new trades again
      if (trade.offerId) {
        const offer = await models.p2pOffer.findByPk(trade.offerId, {
          lock: true,
          transaction,
        });

        if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
          // Parse amountConfig with robust parser
          const amountConfig = parseAmountConfig(offer.amountConfig);

          // Calculate maximum allowed restoration to prevent exceeding original offer amount
          const originalTotal = amountConfig.originalTotal ?? (amountConfig.total + trade.amount);
          const maxAllowedTotal = originalTotal;
          const proposedTotal = amountConfig.total + trade.amount;
          const safeTotal = Math.min(proposedTotal, maxAllowedTotal);

          // Only restore if it would increase the total
          if (safeTotal > amountConfig.total) {
            await offer.update({
              amountConfig: {
                ...amountConfig,
                total: safeTotal,
                originalTotal, // Preserve original total tracking
              },
            }, { transaction });

            console.log('[P2P Trade Cancel] Restored offer amount:', {
              offerId: offer.id,
              offerType: offer.type,
              tradeAmount: trade.amount,
              previousTotal: amountConfig.total,
              newTotal: safeTotal,
              originalTotal,
            });
          } else {
            console.log('[P2P Trade Cancel] Skipped offer restoration - already at or above safe limit:', {
              offerId: offer.id,
              currentTotal: amountConfig.total,
              proposedTotal,
              maxAllowed: maxAllowedTotal,
            });
          }
        }
      }
    }

    // Update trade status and timeline
    // Parse timeline if it's a string
    let timeline = trade.timeline || [];
    if (typeof timeline === "string") {
      try {
        timeline = JSON.parse(timeline);
      } catch (e) {
        console.error("Failed to parse timeline JSON:", e);
        timeline = [];
      }
    }

    // Ensure timeline is an array
    if (!Array.isArray(timeline)) {
      timeline = [];
    }

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
      action: "TRADE_CANCELLED",
      relatedEntity: "TRADE",
      relatedEntityId: trade.id,
      details: JSON.stringify({
        previousStatus: trade.status,
        reason: sanitizedReason,
        amount: trade.amount,
        currency: trade.offer.currency,
        counterpartyId: user.id === trade.buyerId ? trade.sellerId : trade.buyerId,
      }),
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

    // Broadcast WebSocket event for real-time updates
    broadcastP2PTradeEvent(trade.id, {
      type: "STATUS_CHANGE",
      data: {
        status: "CANCELLED",
        previousStatus: trade.status,
        cancelledAt: trade.cancelledAt,
        cancellationReason: sanitizedReason,
        cancelledBy: user.id,
      },
    });

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
