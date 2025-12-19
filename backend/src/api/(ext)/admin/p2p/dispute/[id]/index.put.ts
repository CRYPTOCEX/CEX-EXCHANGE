import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

import { p2pAdminDisputeRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update P2P dispute",
  description: "Updates a P2P dispute including status changes, resolution details, and admin messages. Handles fund distribution when resolving disputes based on the outcome (BUYER_WINS, SELLER_WINS, SPLIT, CANCELLED).",
  operationId: "updateAdminP2PDispute",
  tags: ["Admin", "P2P", "Dispute"],
  requiresAuth: true,
  middleware: [p2pAdminDisputeRateLimit],
  logModule: "ADMIN_P2P",
  logTitle: "Update P2P dispute",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Dispute ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Dispute update data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "RESOLVED"] },
            resolution: {
              type: "object",
              properties: {
                outcome: {
                  type: "string",
                  enum: ["BUYER_WINS", "SELLER_WINS", "SPLIT", "CANCELLED"],
                  description: "Resolution outcome - determines how funds are handled"
                },
                notes: { type: "string" },
              },
            },
            message: { type: "string", description: "Admin message to add to dispute" },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Dispute updated successfully." },
    401: unauthorizedResponse,
    404: notFoundResponse("P2P resource"),
    500: serverErrorResponse,
  },
  permission: "edit.p2p.dispute",
};

export default async (data) => {
  const { params, body, user, ctx } = data;
  const { id } = params;
  const { status, resolution, message } = body;

  // Import utilities
  const { sanitizeInput } = await import("../../../../p2p/utils/validation");
  const { notifyTradeEvent } = await import("../../../../p2p/utils/notifications");
  const { broadcastP2PTradeEvent } = await import("../../../../p2p/trade/[id]/index.ws");
  const { getWalletSafe } = await import("@b/api/finance/wallet/utils");
  const { parseAmountConfig } = await import("../../../../p2p/utils/json-parser");

  const transaction = await sequelize.transaction();

  try {
    ctx?.step("Fetching dispute");
    const dispute = await models.p2pDispute.findByPk(id, {
      include: [{
        model: models.p2pTrade,
        as: "trade",
        include: [{
          model: models.p2pOffer,
          as: "offer",
          attributes: ["currency", "walletType"],
        }],
      }],
      lock: true,
      transaction,
    });

    if (!dispute) {
      await transaction.rollback();
      ctx?.fail("Dispute not found");
      throw createError({ statusCode: 404, message: "Dispute not found" });
    }

    const trade = dispute.trade;
    let tradeUpdated = false;
    let fundsHandled = false;

    ctx?.step("Processing dispute update");
    // Validate status transition if changing status
    if (status) {
      const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED"];
      if (!validStatuses.includes(status)) {
        await transaction.rollback();
        throw createError({
          statusCode: 400,
          message: "Invalid status. Must be PENDING, IN_PROGRESS, or RESOLVED"
        });
      }
      dispute.status = status;
    }

    // Handle resolution with fund management
    if (resolution && resolution.outcome) {
      ctx?.step(`Resolving dispute with outcome: ${resolution.outcome}`);
      const sanitizedNotes = resolution.notes ? sanitizeInput(resolution.notes) : "";
      const outcome = resolution.outcome;

      // Validate outcome
      const validOutcomes = ["BUYER_WINS", "SELLER_WINS", "SPLIT", "CANCELLED"];
      if (!validOutcomes.includes(outcome)) {
        await transaction.rollback();
        throw createError({
          statusCode: 400,
          message: "Invalid resolution outcome"
        });
      }

      // CRITICAL: Only handle funds if trade is in DISPUTED status
      // This prevents double-processing if the trade was already resolved
      if (trade && trade.status === "DISPUTED" && trade.offer) {
        let finalTradeStatus = "COMPLETED";

        if (outcome === "BUYER_WINS" || outcome === "SPLIT") {
          // Release funds to buyer (with escrow fee deduction - same as normal release)
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

              // Log if amounts don't match (indicates potential issue)
              if (safeDeductAmount < trade.amount || safeUnlockAmount < trade.amount) {
                logger.warn("P2P_DISPUTE", `Partial fund handling for trade ${trade.id}: deducted=${safeDeductAmount}, unlocked=${safeUnlockAmount}, expected=${trade.amount}`);
              }

              // Calculate escrow fee - same as normal trade release
              const escrowFeeAmount = parseFloat(trade.escrowFee || "0");
              const platformFee = Math.min(escrowFeeAmount, safeDeductAmount);
              const buyerNetAmount = Math.max(0, safeDeductAmount - platformFee);

              // Credit buyer with net amount (after platform fee deduction)
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
                // Get system admin ID for commission recording
                const systemAdmin = await models.user.findOne({
                  include: [{
                    model: models.role,
                    as: "role",
                    where: { name: "Super Admin" },
                  }],
                  order: [["createdAt", "ASC"]], // Get the oldest super admin
                  transaction,
                });

                if (systemAdmin) {
                  // Record the commission in p2pCommission table
                  await models.p2pCommission.create({
                    adminId: systemAdmin.id,
                    amount: platformFee,
                    description: `P2P escrow fee for disputed trade #${trade.id.slice(0, 8)}... - ${trade.amount} ${trade.offer.currency} (${outcome})`,
                    tradeId: trade.id,
                  }, { transaction });

                  logger.info("P2P_DISPUTE", `Platform commission recorded for trade ${trade.id}: ${platformFee} ${trade.offer.currency}`);
                } else {
                  logger.warn("P2P_DISPUTE", "No super admin found to assign commission");
                }
              }

              // Create transaction records for seller
              await models.transaction.create({
                userId: trade.sellerId,
                walletId: sellerWallet.id,
                type: "P2P_TRADE",
                status: "COMPLETED",
                amount: -safeDeductAmount,
                fee: platformFee,
                description: `P2P dispute resolved (${outcome}) #${trade.id}`,
                referenceId: `p2p-dispute-sell-${trade.id}`,
              }, { transaction });

              // Create transaction record for buyer
              const buyerWalletForTx = buyerWallet || await models.wallet.findOne({
                where: { userId: trade.buyerId, type: trade.offer.walletType, currency: trade.offer.currency },
                transaction,
              });

              if (buyerWalletForTx) {
                await models.transaction.create({
                  userId: trade.buyerId,
                  walletId: buyerWalletForTx.id,
                  type: "P2P_TRADE",
                  status: "COMPLETED",
                  amount: buyerNetAmount,
                  fee: 0,
                  description: `P2P dispute resolved (${outcome}) #${trade.id}`,
                  referenceId: `p2p-dispute-buy-${trade.id}`,
                }, { transaction });
              }

              fundsHandled = true;

              logger.success("P2P_DISPUTE", `Funds transferred to buyer for trade ${trade.id}: ${buyerNetAmount} ${trade.offer.currency} (fee: ${platformFee})`);
            } else {
              logger.warn("P2P_DISPUTE", `No funds available to transfer for trade ${trade.id}`);
            }
          }
          finalTradeStatus = "COMPLETED";
        } else if (outcome === "SELLER_WINS" || outcome === "CANCELLED") {
          // Return funds to seller (unlock from inOrder)
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

              await models.wallet.update({
                inOrder: newInOrder,
              }, {
                where: { id: sellerWallet.id },
                transaction
              });
              fundsHandled = true;

              // Log if amounts don't match
              if (safeUnlockAmount < trade.amount) {
                logger.warn("P2P_DISPUTE", `Partial unlock for trade ${trade.id}: ${safeUnlockAmount}/${trade.amount}`);
              }
            } else {
              logger.warn("P2P_DISPUTE", `No funds to unlock for trade ${trade.id}`);
            }
          }

          // Restore offer available amount since trade was cancelled
          // CRITICAL: Validate against original total to prevent over-restoration
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

                logger.info("P2P_DISPUTE", `Restored offer ${offer.id} amount: ${amountConfig.total} -> ${safeTotal}`);
              } else {
                logger.debug("P2P_DISPUTE", `Skipped offer ${offer.id} restoration - at or above limit`);
              }
            }
          }

          finalTradeStatus = "CANCELLED";
        }

        // Update trade timeline
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
          event: "DISPUTE_RESOLVED",
          message: `Dispute resolved by admin: ${outcome}${sanitizedNotes ? ` - ${sanitizedNotes}` : ""}`,
          userId: user.id,
          adminName: `${user.firstName} ${user.lastName}`,
          resolution: outcome,
          createdAt: new Date().toISOString(),
        });

        // Update trade status
        await trade.update({
          status: finalTradeStatus,
          timeline,
          resolution: { outcome, notes: sanitizedNotes, resolvedBy: user.id },
          completedAt: finalTradeStatus === "COMPLETED" ? new Date() : null,
          cancelledAt: finalTradeStatus === "CANCELLED" ? new Date() : null,
        }, { transaction });

        tradeUpdated = true;
      }

      // Update dispute resolution
      dispute.resolution = {
        outcome,
        notes: sanitizedNotes,
        resolvedBy: user.id,
        resolvedAt: new Date().toISOString(),
        fundsHandled,
      };
      dispute.resolvedOn = new Date();
      dispute.status = "RESOLVED";
    }

    // Handle message
    let sanitizedMessage: string | undefined;
    if (message) {
      sanitizedMessage = sanitizeInput(message);
      if (!sanitizedMessage || sanitizedMessage.length === 0) {
        await transaction.rollback();
        throw createError({
          statusCode: 400,
          message: "Message cannot be empty"
        });
      }

      const messageId = `msg-${Date.now()}-${user.id}`;
      const messageTimestamp = new Date().toISOString();

      // Add to dispute messages
      let existingMessages = dispute.messages;
      if (!Array.isArray(existingMessages)) {
        existingMessages = [];
      }
      existingMessages.push({
        id: messageId,
        sender: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        content: sanitizedMessage,
        createdAt: messageTimestamp,
        isAdmin: true,
      });
      dispute.messages = existingMessages;

      // Also add message to trade timeline for WebSocket broadcast
      if (trade) {
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
          id: messageId,
          event: "MESSAGE",
          message: sanitizedMessage,
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName}`,
          isAdminMessage: true,
          createdAt: messageTimestamp,
        });

        await trade.update({ timeline }, { transaction });

        // Broadcast the message via WebSocket
        broadcastP2PTradeEvent(trade.id, {
          type: "MESSAGE",
          data: {
            id: messageId,
            message: sanitizedMessage,
            senderId: user.id,
            senderName: `${user.firstName} ${user.lastName}`,
            isAdminMessage: true,
            createdAt: messageTimestamp,
          },
        });

        // Notify users about admin message
        notifyTradeEvent(trade.id, "ADMIN_MESSAGE", {
          buyerId: trade.buyerId,
          sellerId: trade.sellerId,
          amount: trade.amount,
          currency: trade.offer?.currency || trade.currency,
          message: sanitizedMessage,
        }).catch((err) => logger.error("P2P_DISPUTE", `Notification error: ${err}`));
      }
    }

    await dispute.save({ transaction });

    ctx?.step("Logging activity");
    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "ADMIN_DISPUTE_UPDATE",
      action: "ADMIN_DISPUTE_UPDATE",
      relatedEntity: "DISPUTE",
      relatedEntityId: dispute.id,
      details: JSON.stringify({
        status: dispute.status,
        hasResolution: !!resolution,
        resolution: resolution?.outcome,
        hasMessage: !!message,
        tradeUpdated,
        fundsHandled,
        adminId: user.id,
        adminName: `${user.firstName} ${user.lastName}`,
      }),
    }, { transaction });

    // Log admin action
    await logP2PAdminAction(
      user.id,
      "DISPUTE_UPDATE",
      "DISPUTE",
      dispute.id,
      {
        status: status || dispute.status,
        hasResolution: !!resolution,
        resolution: resolution?.outcome,
        hasMessage: !!message,
        tradeUpdated,
        fundsHandled,
        adminName: `${user.firstName} ${user.lastName}`,
      }
    );

    await transaction.commit();

    ctx?.step("Broadcasting updates");
    // Broadcast WebSocket event if trade was updated
    if (tradeUpdated && trade) {
      const finalStatus = resolution?.outcome === "BUYER_WINS" || resolution?.outcome === "SPLIT"
        ? "COMPLETED"
        : "CANCELLED";

      broadcastP2PTradeEvent(trade.id, {
        type: "STATUS_CHANGE",
        data: {
          status: finalStatus,
          previousStatus: "DISPUTED",
          disputeResolved: true,
          resolution: resolution?.outcome,
        },
      });

      // Send notification about resolution
      notifyTradeEvent(trade.id, finalStatus === "COMPLETED" ? "TRADE_COMPLETED" : "TRADE_CANCELLED", {
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        amount: trade.amount,
        currency: trade.offer?.currency || trade.currency,
        disputeResolved: true,
        resolution: resolution?.outcome,
      }).catch((err) => logger.error("P2P_DISPUTE", `Trade notification error: ${err}`));
    }

    // Reload dispute with all associations for proper response
    const updatedDispute = await models.p2pDispute.findByPk(id, {
      include: [
        {
          model: models.p2pTrade,
          as: "trade",
          include: [
            {
              model: models.p2pOffer,
              as: "offer",
              attributes: ["id", "type", "currency", "walletType"],
            },
            {
              model: models.user,
              as: "buyer",
              attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
              model: models.user,
              as: "seller",
              attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
          ],
        },
        {
          model: models.user,
          as: "reportedBy",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: models.user,
          as: "against",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
    });

    const plainDispute = updatedDispute?.get({ plain: true }) || dispute.toJSON();

    // Transform messages for frontend compatibility
    const messages = Array.isArray(plainDispute.messages) ? plainDispute.messages.map((msg: any) => ({
      id: msg.id || `${msg.createdAt}-${msg.sender}`,
      sender: msg.senderName || msg.sender || "Unknown",
      senderId: msg.sender,
      content: msg.content || msg.message || "",
      timestamp: msg.createdAt || msg.timestamp,
      isAdmin: msg.isAdmin || false,
      avatar: msg.avatar,
      senderInitials: msg.senderName ? msg.senderName.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "?",
    })) : [];

    // Transform admin notes from activityLog
    const activityLog = Array.isArray(plainDispute.activityLog) ? plainDispute.activityLog : [];
    const adminNotes = activityLog
      .filter((entry: any) => entry.type === "note")
      .map((entry: any) => ({
        content: entry.content || entry.note,
        createdAt: entry.createdAt,
        createdBy: entry.adminName || "Admin",
        adminId: entry.adminId,
      }));

    // Transform evidence for frontend compatibility
    const evidence = Array.isArray(plainDispute.evidence) ? plainDispute.evidence.map((e: any) => ({
      ...e,
      submittedBy: e.submittedBy || "admin",
      timestamp: e.createdAt || e.timestamp,
    })) : [];

    ctx?.success("Dispute updated successfully");
    return {
      ...plainDispute,
      messages,
      adminNotes,
      evidence,
    };
  } catch (err) {
    await transaction.rollback();
    if (err.statusCode) {
      throw err;
    }
    ctx?.fail("Failed to update dispute");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
