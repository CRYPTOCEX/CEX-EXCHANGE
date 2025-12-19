import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Release Funds for Trade",
  description:
    "Releases funds and updates the trade status to 'COMPLETED' for the authenticated seller.",
  operationId: "releaseP2PTradeFunds",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  logModule: "P2P_TRADE",
  logTitle: "Release funds",
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
    200: { description: "Funds released successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; user?: any; ctx?: any }) => {
  const { id } = data.params || {};
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Checking idempotency and validating trade");
  // Import validation and utilities
  const { validateTradeStatusTransition } = await import("../../utils/validation");
  const { notifyTradeEvent } = await import("../../utils/notifications");
  const { broadcastP2PTradeEvent } = await import("./index.ws");
  const { sequelize } = await import("@b/db");
  const { getWalletSafe } = await import("@b/api/finance/wallet/utils");
  const { RedisSingleton } = await import("@b/utils/redis");
  const { createP2PAuditLog, P2PAuditEventType, P2PRiskLevel } = await import("../../utils/audit");

  // Implement idempotency to prevent double-release
  const idempotencyKey = `p2p:release:${id}:${user.id}`;
  const redis = RedisSingleton.getInstance();
  
  try {
    // Check if this operation was already performed
    const existingResult = await redis.get(idempotencyKey);
    if (existingResult) {
      return JSON.parse(existingResult);
    }
    
    // Set a lock to prevent concurrent executions
    const lockKey = `${idempotencyKey}:lock`;
    const lockAcquired = await redis.set(lockKey, "1", "EX", 30, "NX");
    
    if (!lockAcquired) {
      throw createError({ 
        statusCode: 409, 
        message: "Operation already in progress. Please try again." 
      });
    }
  } catch (redisError) {
    // Continue without idempotency if Redis is unavailable
    logger.error("P2P", "Redis error in idempotency check", redisError);
  }

  const transaction = await sequelize.transaction({
    isolationLevel: (sequelize.constructor as any).Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    // Find and lock trade
    const trade = await models.p2pTrade.findOne({
      where: { id, sellerId: user.id },
      include: [{
        model: models.p2pOffer,
        as: "offer",
        attributes: ["currency", "walletType"],
      }],
      lock: true,
      transaction,
    });

    if (!trade) {
      await transaction.rollback();
      throw createError({ statusCode: 404, message: "Trade not found" });
    }

    // Check if already released (additional safety check)
    if (["COMPLETED", "DISPUTED", "CANCELLED", "EXPIRED"].includes(trade.status)) {
      await transaction.rollback();
      throw createError({
        statusCode: 400,
        message: `Funds already released or trade is in final state: ${trade.status}`
      });
    }

    // Validate status transition - from PAYMENT_SENT to COMPLETED
    if (!validateTradeStatusTransition(trade.status, "COMPLETED")) {
      await transaction.rollback();
      throw createError({
        statusCode: 400,
        message: `Cannot release funds from status: ${trade.status}`
      });
    }

    ctx?.step("Processing fund transfer from seller to buyer");
    // Transfer funds to buyer when status is PAYMENT_SENT
    if (trade.status === "PAYMENT_SENT") {
      // This applies to ALL wallet types including FIAT
      // Note: For FIAT, the actual payment happens peer-to-peer externally,
      // but we still need to update platform balances for accounting

      // Get seller's wallet and unlock funds
      const sellerWallet = await getWalletSafe(
        trade.sellerId,
        trade.offer.walletType,
        trade.offer.currency
      );

      if (!sellerWallet) {
        await transaction.rollback();
        throw createError({
          statusCode: 500,
          message: "Seller wallet not found"
        });
      }

      // CRITICAL: Calculate safe amounts to prevent negative values
      // This handles edge cases where funds might have been partially processed
      const safeUnlockAmount = Math.min(trade.amount, sellerWallet.inOrder);
      const safeDeductAmount = Math.min(trade.amount, sellerWallet.balance);

      // Verify we have at least some funds to release
      if (safeUnlockAmount <= 0 && safeDeductAmount <= 0) {
        await transaction.rollback();
        throw createError({
          statusCode: 400,
          message: "No locked funds available to release"
        });
      }

      // Store old values before update for logging
      const previousBalance = sellerWallet.balance;
      const previousInOrder = sellerWallet.inOrder;

      // Unlock funds from seller and deduct balance (with safe amounts)
      const newBalance = Math.max(0, sellerWallet.balance - safeDeductAmount);
      const newInOrder = Math.max(0, sellerWallet.inOrder - safeUnlockAmount);

      await models.wallet.update({
        balance: newBalance,
        inOrder: newInOrder,
      }, {
        where: { id: sellerWallet.id },
        transaction
      });

      // Log warning if amounts don't match expected
      if (safeDeductAmount < trade.amount || safeUnlockAmount < trade.amount) {
        logger.warn("P2P", `Partial fund release: tradeId=${trade.id}, tradeAmount=${trade.amount}, actualDeducted=${safeDeductAmount}, actualUnlocked=${safeUnlockAmount}, sellerBalance=${previousBalance}, sellerInOrder=${previousInOrder}`);
      }

      // Audit log for funds unlocking
      await createP2PAuditLog({
        userId: user.id,
        eventType: P2PAuditEventType.FUNDS_UNLOCKED,
        entityType: "WALLET",
        entityId: sellerWallet.id,
        metadata: {
          tradeId: trade.id,
          amount: trade.amount,
          actualDeducted: safeDeductAmount,
          actualUnlocked: safeUnlockAmount,
          currency: trade.offer.currency,
          previousBalance: previousBalance,
          newBalance: newBalance,
          previousInOrder: previousInOrder,
          newInOrder: newInOrder,
        },
        riskLevel: P2PRiskLevel.HIGH,
      });

      // Calculate fees - use escrowFee as the primary fee (shown to users)
      // The escrowFee is a string, so we need to parse it
      const escrowFeeAmount = parseFloat(trade.escrowFee || "0");

      // For P2P, the fee is deducted from the trade amount before buyer receives it
      // Seller provides trade.amount, platform takes escrowFee, buyer gets the rest
      // CRITICAL: Use actual deducted amount to calculate buyer's net amount
      const platformFee = Math.min(escrowFeeAmount, safeDeductAmount);
      const buyerNetAmount = Math.max(0, safeDeductAmount - platformFee);
      const sellerNetAmount = safeDeductAmount; // Seller pays the actual deducted amount

      ctx?.step(`Transferring ${buyerNetAmount} ${trade.offer.currency} to buyer`);
      // Transfer to buyer (net amount after platform fee)
      const buyerWallet = await getWalletSafe(
        trade.buyerId,
        trade.offer.walletType,
        trade.offer.currency
      );

      if (!buyerWallet) {
        // Create wallet if doesn't exist
        await models.wallet.create({
          userId: trade.buyerId,
          type: trade.offer.walletType,
          currency: trade.offer.currency,
          balance: buyerNetAmount,
          inOrder: 0,
        }, { transaction });
      } else {
        // Use models.wallet.update since getWalletSafe returns a plain object
        await models.wallet.update({
          balance: buyerWallet.balance + buyerNetAmount,
        }, {
          where: { id: buyerWallet.id },
          transaction
        });
      }
      
      // Audit log for funds transfer
      await createP2PAuditLog({
        userId: user.id,
        eventType: P2PAuditEventType.FUNDS_TRANSFERRED,
        entityType: "TRADE",
        entityId: trade.id,
        metadata: {
          fromUserId: trade.sellerId,
          toUserId: trade.buyerId,
          requestedAmount: trade.amount,
          actualDeducted: safeDeductAmount,
          buyerNetAmount,
          platformFee,
          escrowFee: escrowFeeAmount,
          currency: trade.offer.currency,
          walletType: trade.offer.walletType,
        },
        riskLevel: P2PRiskLevel.CRITICAL,
      });

      // Create transaction records for seller (uses seller's wallet)
      // CRITICAL: Use actual deducted amount for accurate transaction records
      await models.transaction.create({
        userId: trade.sellerId,
        walletId: sellerWallet.id,
        type: "P2P_TRADE",
        status: "COMPLETED",
        amount: -safeDeductAmount,
        fee: platformFee, // Platform fee deducted from trade
        description: `P2P trade release #${trade.id}`,
        referenceId: `p2p-sell-${trade.id}`,
      }, { transaction });

      // Create transaction record for buyer (uses buyer's wallet)
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
          amount: buyerNetAmount, // Buyer receives amount minus platform fee
          fee: 0, // Fee was already deducted
          description: `P2P trade receive #${trade.id}`,
          referenceId: `p2p-buy-${trade.id}`,
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
            description: `P2P escrow fee for trade #${trade.id.slice(0, 8)}... - ${trade.amount} ${trade.offer.currency}`,
            tradeId: trade.id,
          }, { transaction });

          logger.debug("P2P", `Platform commission recorded: tradeId=${trade.id}, adminId=${systemAdmin.id}, fee=${platformFee} ${trade.offer.currency}`);
        } else {
          logger.warn("P2P", "No super admin found to assign commission");
        }
      }

      logger.info("P2P", `Funds transferred: tradeId=${trade.id}, seller=${trade.sellerId}, buyer=${trade.buyerId}, ${trade.offer.walletType} ${trade.offer.currency}, amount=${safeDeductAmount}, fee=${platformFee}, buyerReceives=${buyerNetAmount}`);
    }

    ctx?.step("Updating trade status to COMPLETED");
    // Update trade status and timeline
    // Parse timeline if it's a string
    let timeline = trade.timeline || [];
    if (typeof timeline === "string") {
      try {
        timeline = JSON.parse(timeline);
      } catch (e) {
        logger.error("P2P", "Failed to parse timeline JSON", e);
        timeline = [];
      }
    }

    // Ensure timeline is an array
    if (!Array.isArray(timeline)) {
      timeline = [];
    }

    timeline.push({
      event: "FUNDS_RELEASED",
      message: "Seller released funds - Trade completed",
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    const previousStatus = trade.status;
    const completedAt = new Date();

    await trade.update({
      status: "COMPLETED",
      timeline,
      completedAt,
    }, { transaction });

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "TRADE_COMPLETED",
      action: "TRADE_COMPLETED",
      relatedEntity: "TRADE",
      relatedEntityId: trade.id,
      details: JSON.stringify({
        previousStatus,
        amount: trade.amount,
        currency: trade.offer.currency,
      }),
    }, { transaction });

    await transaction.commit();

    // Send notifications - use TRADE_COMPLETED event
    notifyTradeEvent(trade.id, "TRADE_COMPLETED", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer.currency,
    }).catch((err) => logger.error("P2P", "Failed to notify trade event", err));

    // Broadcast WebSocket event for real-time updates
    broadcastP2PTradeEvent(trade.id, {
      type: "STATUS_CHANGE",
      data: {
        status: "COMPLETED",
        previousStatus,
        completedAt,
        timeline,
      },
    });

    const result = {
      message: "Funds released successfully. Trade completed.",
      trade: {
        id: trade.id,
        status: "COMPLETED",
        completedAt,
      }
    };

    ctx?.success(`Released funds for trade ${trade.id.slice(0, 8)}... (${trade.amount} ${trade.offer.currency})`);

    // Cache the successful result for idempotency
    try {
      await redis.setex(idempotencyKey, 3600, JSON.stringify(result)); // Cache for 1 hour
      await redis.del(`${idempotencyKey}:lock`); // Release the lock
    } catch (redisError) {
      logger.error("P2P", "Redis error in caching result", redisError);
    }

    return result;
  } catch (err: any) {
    await transaction.rollback();
    
    // Release the lock on error
    try {
      await redis.del(`${idempotencyKey}:lock`);
    } catch (redisError) {
      logger.error("P2P", "Redis error in releasing lock", redisError);
    }
    
    if (err.statusCode) {
      throw err;
    }
    
    throw createError({
      statusCode: 500,
      message: "Failed to release funds: " + err.message,
    });
  }
};
