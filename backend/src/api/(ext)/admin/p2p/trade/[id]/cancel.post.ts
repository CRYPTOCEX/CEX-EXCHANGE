import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";

export const metadata = {
  summary: "Cancel Trade (Admin)",
  description: "Cancels a trade with a provided cancellation reason, releases locked funds back to seller.",
  operationId: "cancelAdminP2PTrade",
  tags: ["Admin", "Trades", "P2P"],
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Cancel P2P trade",
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
  permission: "edit.p2p.trade",
};

export default async (data) => {
  const { params, body, user, ctx } = data;
  const { id } = params;
  const { reason } = body;

  // Import utilities
  const { notifyTradeEvent } = await import("../../../../p2p/utils/notifications");
  const { broadcastP2PTradeEvent } = await import("../../../../p2p/trade/[id]/index.ws");
  const { getWalletSafe } = await import("@b/api/finance/wallet/utils");
  const { sanitizeInput } = await import("../../../../p2p/utils/validation");
  const { parseAmountConfig } = await import("../../../../p2p/utils/json-parser");

  const transaction = await sequelize.transaction();

  try {
    ctx?.step("Fetching trade");
    const trade = await models.p2pTrade.findByPk(id, {
      include: [{
        model: models.p2pOffer,
        as: "offer",
        attributes: ["id", "currency", "walletType", "amountConfig", "status", "type"],
      }],
      lock: true,
      transaction,
    });

    if (!trade) {
      await transaction.rollback();
      ctx?.fail("Trade not found");
      throw createError({ statusCode: 404, message: "Trade not found" });
    }

    ctx?.step("Validating trade status");
    // Check if trade can be cancelled
    if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(trade.status)) {
      await transaction.rollback();
      ctx?.fail(`Cannot cancel trade with status: ${trade.status}`);
      throw createError({
        statusCode: 400,
        message: `Cannot cancel trade with status: ${trade.status}`
      });
    }

    const sanitizedReason = reason ? sanitizeInput(reason) : "Cancelled by admin";
    const previousStatus = trade.status;

    ctx?.step("Processing fund unlocking and offer restoration");
    // Handle fund unlocking and offer restoration based on offer type
    // - For SELL offers: Funds were locked at offer creation, stay locked until offer is deleted
    //                    Only restore offer amount, don't unlock wallet inOrder
    // - For BUY offers: Funds were locked at trade initiation, need to unlock on cancel
    if (["PENDING", "PAYMENT_SENT", "DISPUTED"].includes(trade.status) && trade.offer) {
      const isBuyOffer = trade.offer.type === "BUY";

      // Only unlock wallet inOrder for BUY offers (funds were locked at trade initiation)
      if (isBuyOffer) {
        try {
          const sellerWallet = await getWalletSafe(
            trade.sellerId,
            trade.offer.walletType,
            trade.offer.currency
          );

          if (sellerWallet) {
            // CRITICAL: Calculate safe unlock amount to prevent negative inOrder
            const safeUnlockAmount = Math.min(trade.amount, sellerWallet.inOrder);

            if (safeUnlockAmount > 0) {
              const newInOrder = Math.max(0, sellerWallet.inOrder - safeUnlockAmount);

              // Unlock funds from inOrder
              await models.wallet.update({
                inOrder: newInOrder,
              }, {
                where: { id: sellerWallet.id },
                transaction
              });

              logger.info("P2P_ADMIN_CANCEL", `Released ${safeUnlockAmount} ${trade.offer.currency} for seller ${trade.sellerId} (BUY offer)`);

              // Log warning if amounts don't match
              if (safeUnlockAmount < trade.amount) {
                logger.warn("P2P_ADMIN_CANCEL", `Partial unlock for trade ${trade.id}: ${safeUnlockAmount}/${trade.amount}`);
              }
            } else {
              logger.warn("P2P_ADMIN_CANCEL", `No funds to unlock for trade ${trade.id} - inOrder is already 0`);
            }
          }
        } catch (walletError) {
          logger.error("P2P_ADMIN_CANCEL", `Failed to release wallet funds: ${walletError}`);
          // Continue with cancellation even if fund release fails
        }
      } else {
        // For SELL offers: Don't unlock wallet inOrder, funds stay locked for the offer
        logger.info("P2P_ADMIN_CANCEL", `SELL offer - funds remain locked for offer ${trade.offerId}`);
      }

      // Restore offer amount if applicable (for both SELL and BUY offers)
      // This makes the amount available for new trades again
      if (trade.offerId) {
        const offer = await models.p2pOffer.findByPk(trade.offerId, {
          lock: true,
          transaction,
        });

        if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
          const amountConfig = parseAmountConfig(offer.amountConfig);

          // Calculate safe restoration amount
          const originalTotal = amountConfig.originalTotal ?? (amountConfig.total + trade.amount);
          const proposedTotal = amountConfig.total + trade.amount;
          const safeTotal = Math.min(proposedTotal, originalTotal);

          if (safeTotal > amountConfig.total) {
            await offer.update({
              amountConfig: {
                ...amountConfig,
                total: safeTotal,
                originalTotal,
              },
            }, { transaction });

            logger.info("P2P_ADMIN_CANCEL", `Restored offer ${offer.id} amount: ${amountConfig.total} -> ${safeTotal}`);
          } else {
            logger.debug("P2P_ADMIN_CANCEL", `Skipped offer ${offer.id} restoration - at or above limit`);
          }
        }
      }
    }

    // Update timeline
    let timeline = trade.timeline || [];
    if (typeof timeline === "string") {
      try {
        timeline = JSON.parse(timeline);
      } catch (e) {
        timeline = [];
      }
    }
    if (!Array.isArray(timeline)) {
      timeline = [];
    }

    timeline.push({
      event: "ADMIN_CANCELLED",
      message: `Trade cancelled by admin: ${sanitizedReason}`,
      userId: user.id,
      adminName: `${user.firstName} ${user.lastName}`,
      createdAt: new Date().toISOString(),
    });

    ctx?.step("Updating trade status");
    // Update trade
    await trade.update({
      status: "CANCELLED",
      timeline,
      cancelledBy: user.id,
      cancellationReason: sanitizedReason,
      cancelledAt: new Date(),
    }, { transaction });

    ctx?.step("Logging activity");
    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "ADMIN_TRADE_CANCELLED",
      action: "ADMIN_TRADE_CANCELLED",
      relatedEntity: "TRADE",
      relatedEntityId: trade.id,
      details: JSON.stringify({
        previousStatus,
        reason: sanitizedReason,
        amount: trade.amount,
        currency: trade.offer?.currency,
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        adminId: user.id,
        adminName: `${user.firstName} ${user.lastName}`,
      }),
    }, { transaction });

    // Log admin action
    await logP2PAdminAction(
      user.id,
      "TRADE_CANCELLED",
      "TRADE",
      trade.id,
      {
        previousStatus,
        reason: sanitizedReason,
        amount: trade.amount,
      }
    );

    await transaction.commit();

    ctx?.step("Sending notifications");
    // Send notifications
    notifyTradeEvent(trade.id, "TRADE_CANCELLED", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer?.currency || trade.currency,
      cancelledBy: user.id,
      reason: sanitizedReason,
      adminCancelled: true,
    }).catch((err) => logger.error("P2P_ADMIN_CANCEL", `Notification error: ${err}`));

    // Broadcast WebSocket event
    broadcastP2PTradeEvent(trade.id, {
      type: "STATUS_CHANGE",
      data: {
        status: "CANCELLED",
        previousStatus,
        cancelledAt: new Date(),
        cancellationReason: sanitizedReason,
        adminCancelled: true,
        timeline,
      },
    });

    ctx?.success("Trade cancelled successfully");
    return {
      message: "Trade cancelled successfully.",
      trade: {
        id: trade.id,
        status: "CANCELLED",
        cancelledAt: trade.cancelledAt,
      }
    };
  } catch (err) {
    await transaction.rollback();
    if (err.statusCode) {
      throw err;
    }
    ctx?.fail("Failed to cancel trade");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
