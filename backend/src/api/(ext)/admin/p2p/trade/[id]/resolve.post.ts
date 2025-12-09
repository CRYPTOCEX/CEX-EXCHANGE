import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminTradeRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";

export const metadata = {
  summary: "Resolve Trade (Admin)",
  description:
    "Resolves a disputed trade by updating its status, handling funds based on resolution outcome.",
  operationId: "resolveAdminP2PTrade",
  tags: ["Admin", "Trades", "P2P"],
  requiresAuth: true,
  middleware: [p2pAdminTradeRateLimit],
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
    description: "Resolution details",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            resolution: {
              type: "string",
              enum: ["BUYER_WINS", "SELLER_WINS", "SPLIT", "CANCELLED"],
              description: "Resolution outcome"
            },
            notes: { type: "string", description: "Admin notes about the resolution" },
          },
          required: ["resolution"],
        },
      },
    },
  },
  responses: {
    200: { description: "Trade resolved successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.trade",
};

export default async (data) => {
  const { params, body, user } = data;
  const { id } = params;
  const { resolution, notes } = body;

  // Import utilities
  const { notifyTradeEvent } = await import("../../../../p2p/utils/notifications");
  const { broadcastP2PTradeEvent } = await import("../../../../p2p/trade/[id]/index.ws");
  const { getWalletSafe } = await import("@b/api/finance/wallet/utils");
  const { sanitizeInput } = await import("../../../../p2p/utils/validation");
  const { parseAmountConfig } = await import("../../../../p2p/utils/json-parser");

  const transaction = await sequelize.transaction();

  try {
    const trade = await models.p2pTrade.findByPk(id, {
      include: [{
        model: models.p2pOffer,
        as: "offer",
        attributes: ["currency", "walletType", "type", "id"],
      }],
      lock: true,
      transaction,
    });

    if (!trade) {
      await transaction.rollback();
      throw createError({ statusCode: 404, message: "Trade not found" });
    }

    // Validate trade can be resolved
    if (!["DISPUTED", "PAYMENT_SENT", "PENDING"].includes(trade.status)) {
      await transaction.rollback();
      throw createError({
        statusCode: 400,
        message: `Cannot resolve trade with status: ${trade.status}`
      });
    }

    const sanitizedNotes = notes ? sanitizeInput(notes) : "";
    const previousStatus = trade.status;
    let finalStatus = "COMPLETED";
    let fundsReleased = false;

    // Handle funds based on resolution
    if (resolution === "BUYER_WINS" || resolution === "SPLIT") {
      // Release funds to buyer (or split - for now treating as buyer wins)
      if (trade.offer && trade.status !== "COMPLETED") {
        const sellerWallet = await getWalletSafe(
          trade.sellerId,
          trade.offer.walletType,
          trade.offer.currency
        );

        if (sellerWallet) {
          // CRITICAL: Calculate safe amounts to prevent negative values
          const safeUnlockAmount = Math.min(trade.amount, sellerWallet.inOrder);
          const safeDeductAmount = Math.min(trade.amount, sellerWallet.balance);

          if (safeUnlockAmount > 0 || safeDeductAmount > 0) {
            // Calculate platform fee from escrowFee
            const platformFee = parseFloat(trade.escrowFee || "0");
            const buyerNetAmount = Math.max(0, safeDeductAmount - platformFee);

            // Unlock and deduct from seller
            const newBalance = Math.max(0, sellerWallet.balance - safeDeductAmount);
            const newInOrder = Math.max(0, sellerWallet.inOrder - safeUnlockAmount);

            await models.wallet.update({
              balance: newBalance,
              inOrder: newInOrder,
            }, {
              where: { id: sellerWallet.id },
              transaction
            });

            // Log if amounts don't match
            if (safeDeductAmount < trade.amount || safeUnlockAmount < trade.amount) {
              console.warn('[P2P Admin Resolve] WARNING: Partial fund handling:', {
                tradeId: trade.id,
                tradeAmount: trade.amount,
                actualDeducted: safeDeductAmount,
                actualUnlocked: safeUnlockAmount,
              });
            }

            // Credit buyer (net amount after platform fee)
            const buyerWallet = await getWalletSafe(
              trade.buyerId,
              trade.offer.walletType,
              trade.offer.currency
            );

            if (buyerWallet) {
              await models.wallet.update({
                balance: buyerWallet.balance + buyerNetAmount,
              }, {
                where: { id: buyerWallet.id },
                transaction
              });
            } else {
              await models.wallet.create({
                userId: trade.buyerId,
                type: trade.offer.walletType,
                currency: trade.offer.currency,
                balance: buyerNetAmount,
                inOrder: 0,
              }, { transaction });
            }

            // Record platform commission if there's a fee
            if (platformFee > 0) {
              // Record the commission (admin resolving gets the commission assigned to them)
              await models.p2pCommission.create({
                adminId: user.id,
                amount: platformFee,
                description: `P2P escrow fee for resolved trade #${trade.id.slice(0, 8)}... - ${trade.amount} ${trade.offer.currency}`,
                tradeId: trade.id,
              }, { transaction });

              console.log('[P2P Admin Resolve] Platform commission recorded:', {
                tradeId: trade.id,
                adminId: user.id,
                platformFee,
                buyerNetAmount,
                currency: trade.offer.currency,
              });
            }

            fundsReleased = true;
          } else {
            console.warn('[P2P Admin Resolve] WARNING: No funds available to transfer:', {
              tradeId: trade.id,
              sellerBalance: sellerWallet.balance,
              sellerInOrder: sellerWallet.inOrder,
            });
          }
        }
      }
      finalStatus = "COMPLETED";
    } else if (resolution === "SELLER_WINS" || resolution === "CANCELLED") {
      // Return funds to seller - behavior depends on offer type
      // - For SELL offers: Funds stay locked for the offer, just restore offer amount
      // - For BUY offers: Unlock funds from seller's inOrder
      if (trade.offer && trade.status !== "COMPLETED") {
        const isBuyOffer = trade.offer.type === "BUY";

        // Only unlock wallet inOrder for BUY offers
        if (isBuyOffer) {
          const sellerWallet = await getWalletSafe(
            trade.sellerId,
            trade.offer.walletType,
            trade.offer.currency
          );

          if (sellerWallet) {
            // CRITICAL: Calculate safe unlock amount
            const safeUnlockAmount = Math.min(trade.amount, sellerWallet.inOrder);

            if (safeUnlockAmount > 0) {
              const newInOrder = Math.max(0, sellerWallet.inOrder - safeUnlockAmount);

              await models.wallet.update({
                inOrder: newInOrder,
              }, {
                where: { id: sellerWallet.id },
                transaction
              });
              fundsReleased = true;

              console.log(`[P2P Admin Resolve ${resolution}] Unlocked funds (BUY offer):`, {
                tradeId: trade.id,
                tradeAmount: trade.amount,
                actualUnlocked: safeUnlockAmount,
              });

              if (safeUnlockAmount < trade.amount) {
                console.warn(`[P2P Admin Resolve ${resolution}] WARNING: Partial unlock:`, {
                  tradeId: trade.id,
                  tradeAmount: trade.amount,
                  actualUnlocked: safeUnlockAmount,
                });
              }
            } else {
              console.warn(`[P2P Admin Resolve ${resolution}] WARNING: No funds to unlock:`, {
                tradeId: trade.id,
                currentInOrder: sellerWallet.inOrder,
              });
            }
          }
        } else {
          // For SELL offers: Don't unlock wallet inOrder, funds stay locked for the offer
          console.log(`[P2P Admin Resolve ${resolution}] SELL offer - funds remain locked for offer:`, {
            tradeId: trade.id,
            offerId: trade.offerId,
            amount: trade.amount,
            currency: trade.offer.currency,
          });
        }

        // Restore offer available amount since trade was cancelled (for both SELL and BUY offers)
        if (trade.offerId) {
          const offer = await models.p2pOffer.findByPk(trade.offerId, {
            lock: true,
            transaction,
          });

          if (offer && ["ACTIVE", "PAUSED"].includes(offer.status)) {
            const amountConfig = parseAmountConfig(offer.amountConfig);

            // Calculate safe restoration
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

              console.log(`[P2P Admin Resolve ${resolution}] Restored offer amount:`, {
                offerId: offer.id,
                offerType: offer.type,
                previousTotal: amountConfig.total,
                newTotal: safeTotal,
              });
            }
          }
        }
      }
      finalStatus = "CANCELLED";
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
      event: "ADMIN_RESOLVED",
      message: `Trade resolved by admin: ${resolution}${sanitizedNotes ? ` - ${sanitizedNotes}` : ""}`,
      userId: user.id,
      adminName: `${user.firstName} ${user.lastName}`,
      resolution,
      createdAt: new Date().toISOString(),
    });

    // Update trade
    await trade.update({
      status: finalStatus,
      timeline,
      resolution: { outcome: resolution, notes: sanitizedNotes, resolvedBy: user.id },
      completedAt: finalStatus === "COMPLETED" ? new Date() : null,
      cancelledAt: finalStatus === "CANCELLED" ? new Date() : null,
    }, { transaction });

    // Update related dispute if exists
    const dispute = await models.p2pDispute.findOne({
      where: { tradeId: id },
      transaction,
    });

    if (dispute) {
      await dispute.update({
        status: "RESOLVED",
        resolution: {
          outcome: resolution,
          notes: sanitizedNotes,
          resolvedBy: user.id,
          resolvedAt: new Date().toISOString(),
        },
        resolvedOn: new Date(),
      }, { transaction });
    }

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "ADMIN_TRADE_RESOLVED",
      action: "ADMIN_TRADE_RESOLVED",
      relatedEntity: "TRADE",
      relatedEntityId: trade.id,
      details: JSON.stringify({
        previousStatus,
        finalStatus,
        resolution,
        notes: sanitizedNotes,
        fundsReleased,
        adminId: user.id,
        adminName: `${user.firstName} ${user.lastName}`,
      }),
    }, { transaction });

    // Log admin action
    await logP2PAdminAction(
      user.id,
      "TRADE_RESOLVED",
      "TRADE",
      trade.id,
      {
        previousStatus,
        finalStatus,
        resolution,
        fundsReleased,
      }
    );

    await transaction.commit();

    // Send notifications
    notifyTradeEvent(trade.id, finalStatus === "COMPLETED" ? "TRADE_COMPLETED" : "TRADE_CANCELLED", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer?.currency || trade.currency,
      adminResolved: true,
      resolution,
    }).catch(console.error);

    // Broadcast WebSocket event
    broadcastP2PTradeEvent(trade.id, {
      type: "STATUS_CHANGE",
      data: {
        status: finalStatus,
        previousStatus,
        resolution,
        adminResolved: true,
        timeline,
      },
    });

    return {
      message: "Trade resolved successfully.",
      trade: {
        id: trade.id,
        status: finalStatus,
        resolution,
        fundsReleased,
      }
    };
  } catch (err) {
    await transaction.rollback();
    if (err.statusCode) {
      throw err;
    }
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
