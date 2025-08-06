import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Release Funds for Trade",
  description:
    "Releases funds and updates the trade status to 'COMPLETED' for the authenticated seller.",
  operationId: "releaseP2PTradeFunds",
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
    200: { description: "Funds released successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; user?: any }) => {
  const { id } = data.params || {};
  const { user } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Import validation and utilities
  const { validateTradeStatusTransition } = await import("../../utils/validation");
  const { notifyTradeEvent } = await import("../../utils/notifications");
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
    console.error("Redis error in idempotency check:", redisError);
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
    if (["ESCROW_RELEASED", "COMPLETED", "DISPUTED", "CANCELLED"].includes(trade.status)) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 400, 
        message: `Funds already released or trade is in final state: ${trade.status}` 
      });
    }

    // Validate status transition
    const targetStatus = trade.status === "PAYMENT_SENT" ? "ESCROW_RELEASED" : "COMPLETED";
    
    if (!validateTradeStatusTransition(trade.status, targetStatus)) {
      await transaction.rollback();
      throw createError({ 
        statusCode: 400, 
        message: `Cannot release funds from status: ${trade.status}` 
      });
    }

    // For ESCROW_RELEASED, transfer funds to buyer
    if (targetStatus === "ESCROW_RELEASED") {
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

      // Verify funds are still locked
      if (sellerWallet.inOrder < trade.amount) {
        await transaction.rollback();
        throw createError({ 
          statusCode: 400, 
          message: "Insufficient locked funds" 
        });
      }

      // Unlock funds from seller
      await sellerWallet.update({
        balance: sellerWallet.balance - trade.amount,
        inOrder: sellerWallet.inOrder - trade.amount,
      }, { transaction });
      
      // Audit log for funds unlocking
      await createP2PAuditLog({
        userId: user.id,
        eventType: P2PAuditEventType.FUNDS_UNLOCKED,
        entityType: "WALLET",
        entityId: sellerWallet.id,
        metadata: {
          tradeId: trade.id,
          amount: trade.amount,
          currency: trade.offer.currency,
          previousBalance: sellerWallet.balance + trade.amount,
          newBalance: sellerWallet.balance,
          previousInOrder: sellerWallet.inOrder + trade.amount,
          newInOrder: sellerWallet.inOrder,
        },
        riskLevel: P2PRiskLevel.HIGH,
      });

      // Calculate net amounts after fees
      const buyerNetAmount = trade.amount - (trade.buyerFee || 0);
      const sellerNetAmount = trade.amount - (trade.sellerFee || 0);

      // Transfer to buyer (net amount after fees)
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
        await buyerWallet.update({
          balance: buyerWallet.balance + buyerNetAmount,
        }, { transaction });
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
          amount: trade.amount,
          buyerNetAmount,
          sellerFee: trade.sellerFee || 0,
          buyerFee: trade.buyerFee || 0,
          currency: trade.offer.currency,
          walletType: trade.offer.walletType,
        },
        riskLevel: P2PRiskLevel.CRITICAL,
      });

      // Create transaction records
      await models.transaction.create({
        userId: trade.sellerId,
        type: "P2P_RELEASE",
        status: "COMPLETED",
        amount: -trade.amount,
        fee: trade.sellerFee || 0,
        currency: trade.offer.currency,
        description: `P2P trade release #${trade.id}`,
        referenceId: trade.id,
      }, { transaction });

      await models.transaction.create({
        userId: trade.buyerId,
        type: "P2P_RECEIVE",
        status: "COMPLETED",
        amount: buyerNetAmount,
        fee: trade.buyerFee || 0,
        currency: trade.offer.currency,
        description: `P2P trade receive #${trade.id}`,
        referenceId: trade.id,
      }, { transaction });

      // Create fee transactions if applicable
      const { createFeeTransactions } = await import("../../utils/fees");
      if ((trade.buyerFee || 0) > 0 || (trade.sellerFee || 0) > 0) {
        await createFeeTransactions(
          trade.id,
          trade.buyerId,
          trade.sellerId,
          {
            buyerFee: trade.buyerFee || 0,
            sellerFee: trade.sellerFee || 0,
            totalFee: (trade.buyerFee || 0) + (trade.sellerFee || 0),
            netAmountBuyer: buyerNetAmount,
            netAmountSeller: sellerNetAmount,
          },
          trade.offer.currency,
          transaction
        );
      }
    }

    // Update trade status and timeline
    const timeline = trade.timeline || [];
    timeline.push({
      event: targetStatus === "ESCROW_RELEASED" ? "FUNDS_RELEASED" : "TRADE_COMPLETED",
      message: targetStatus === "ESCROW_RELEASED" ? "Seller released funds" : "Trade completed",
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    await trade.update({ 
      status: targetStatus,
      timeline,
      completedAt: targetStatus === "COMPLETED" ? new Date() : undefined,
      escrowReleasedAt: targetStatus === "ESCROW_RELEASED" ? new Date() : undefined,
    }, { transaction });

    // If moving to completed, update the next status
    if (targetStatus === "ESCROW_RELEASED") {
      // Auto-complete after escrow release (could be configurable)
      setTimeout(async () => {
        try {
          await trade.update({ 
            status: "COMPLETED",
            completedAt: new Date(),
          });
        } catch (error) {
          console.error("Failed to auto-complete trade:", error);
        }
      }, 5000); // 5 seconds delay
    }

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: targetStatus === "ESCROW_RELEASED" ? "FUNDS_RELEASED" : "TRADE_COMPLETED",
      entityId: trade.id,
      entityType: "TRADE",
      metadata: {
        previousStatus: trade.status,
        amount: trade.amount,
        currency: trade.offer.currency,
      },
    }, { transaction });

    await transaction.commit();

    // Send notifications
    notifyTradeEvent(trade.id, targetStatus, {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer.currency,
    }).catch(console.error);

    const result = { 
      message: targetStatus === "ESCROW_RELEASED" 
        ? "Funds released successfully." 
        : "Trade completed successfully.",
      trade: {
        id: trade.id,
        status: targetStatus,
        completedAt: trade.completedAt,
        escrowReleasedAt: trade.escrowReleasedAt,
      }
    };

    // Cache the successful result for idempotency
    try {
      await redis.setex(idempotencyKey, 3600, JSON.stringify(result)); // Cache for 1 hour
      await redis.del(`${idempotencyKey}:lock`); // Release the lock
    } catch (redisError) {
      console.error("Redis error in caching result:", redisError);
    }

    return result;
  } catch (err: any) {
    await transaction.rollback();
    
    // Release the lock on error
    try {
      await redis.del(`${idempotencyKey}:lock`);
    } catch (redisError) {
      console.error("Redis error in releasing lock:", redisError);
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
