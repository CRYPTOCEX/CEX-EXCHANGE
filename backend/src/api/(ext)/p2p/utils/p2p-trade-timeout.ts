import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { getWalletSafe } from "@b/api/finance/wallet/utils";
import { notifyTradeEvent } from "@b/api/(ext)/p2p/utils/notifications";

/**
 * P2P Trade Timeout Handler
 * This job runs periodically to handle expired trades
 */
export async function handleP2PTradeTimeouts() {
  console.log("[P2P] Starting trade timeout handler...");

  try {
    // Find all trades that have expired
    const expiredTrades = await models.p2pTrade.findAll({
      where: {
        status: {
          [Op.in]: ["PENDING", "PAYMENT_SENT"],
        },
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
      include: [
        {
          model: models.p2pOffer,
          as: "offer",
          attributes: ["id", "currency", "walletType", "userId"],
        },
      ],
    });

    console.log(`[P2P] Found ${expiredTrades.length} expired trades`);

    for (const trade of expiredTrades) {
      const transaction = await sequelize.transaction();

      try {
        // Lock the trade
        const lockedTrade = await models.p2pTrade.findByPk(trade.id, {
          lock: true,
          transaction,
        });

        // Double-check status hasn't changed
        if (!lockedTrade || 
            !["PENDING", "PAYMENT_SENT"].includes(lockedTrade.status) ||
            new Date(lockedTrade.expiresAt) > new Date()) {
          await transaction.rollback();
          continue;
        }

        // If funds were locked (seller's funds), release them
        if (lockedTrade.status === "PENDING" || lockedTrade.status === "PAYMENT_SENT") {
          const sellerWallet = await getWalletSafe(
            lockedTrade.sellerId,
            trade.offer.walletType,
            trade.offer.currency
          );

          if (sellerWallet && sellerWallet.inOrder >= trade.amount) {
            // Release locked funds
            await sellerWallet.update({
              inOrder: sellerWallet.inOrder - trade.amount,
            }, { transaction });

            console.log(`[P2P] Released ${trade.amount} ${trade.offer.currency} for seller ${lockedTrade.sellerId}`);
          }
        }

        // Update trade status
        const timeline = lockedTrade.timeline || [];
        timeline.push({
          event: "TRADE_EXPIRED",
          message: "Trade expired due to timeout",
          userId: "system",
          createdAt: new Date().toISOString(),
        });

        await lockedTrade.update({
          status: "EXPIRED",
          timeline,
          expiredAt: new Date(),
        }, { transaction });

        // If offer was associated, restore the amount
        if (trade.offerId) {
          const offer = await models.p2pOffer.findByPk(trade.offerId, {
            lock: true,
            transaction,
          });

          if (offer && offer.status === "ACTIVE") {
            await offer.update({
              amountConfig: {
                ...offer.amountConfig,
                total: (offer.amountConfig.total || 0) + trade.amount,
              },
            }, { transaction });
          }
        }

        // Log activity
        await models.p2pActivityLog.create({
          userId: "system",
          type: "TRADE_EXPIRED",
          action: "EXPIRED",
          relatedEntity: "TRADE",
          relatedEntityId: trade.id,
          details: JSON.stringify({
            previousStatus: lockedTrade.status,
            amount: trade.amount,
            currency: trade.offer.currency,
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
          }),
        }, { transaction });

        await transaction.commit();

        // Send notifications (non-blocking)
        notifyTradeEvent(trade.id, "TRADE_EXPIRED", {
          buyerId: trade.buyerId,
          sellerId: trade.sellerId,
          amount: trade.amount,
          currency: trade.offer.currency,
        }).catch(console.error);

        console.log(`[P2P] Successfully expired trade ${trade.id}`);
      } catch (error) {
        await transaction.rollback();
        console.error(`[P2P] Failed to expire trade ${trade.id}:`, error);
      }
    }

    // Handle offers that need to expire
    await handleExpiredOffers();

  } catch (error) {
    console.error("[P2P] Trade timeout handler error:", error);
  }
}

/**
 * Handle expired offers
 */
async function handleExpiredOffers() {
  try {
    // Find offers that should expire (e.g., older than 30 days with no activity)
    const OFFER_EXPIRY_DAYS = 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - OFFER_EXPIRY_DAYS);

    const expiredOffers = await models.p2pOffer.findAll({
      where: {
        status: "ACTIVE",
        updatedAt: {
          [Op.lt]: expiryDate,
        },
        amountConfig: sequelize.literal(`"amountConfig"->>'total' = '0' OR "amountConfig"->>'total'::numeric <= 0`),
      },
    });

    console.log(`[P2P] Found ${expiredOffers.length} expired offers`);

    for (const offer of expiredOffers) {
      try {
        await offer.update({
          status: "EXPIRED",
          adminNotes: `Auto-expired due to inactivity and zero balance at ${new Date().toISOString()}`,
        });

        // Log activity
        await models.p2pActivityLog.create({
          userId: "system",
          type: "OFFER_EXPIRED",
          action: "EXPIRED",
          relatedEntity: "OFFER",
          relatedEntityId: offer.id,
          details: JSON.stringify({
            reason: "inactivity_and_zero_balance",
            lastUpdated: offer.updatedAt,
          }),
        });

        // Notify user
        const { notifyOfferEvent } = await import("@b/api/(ext)/p2p/utils/notifications");
        notifyOfferEvent(offer.id, "OFFER_EXPIRED", {
          reason: "Inactivity and zero balance",
        }).catch(console.error);

        console.log(`[P2P] Expired offer ${offer.id}`);
      } catch (error) {
        console.error(`[P2P] Failed to expire offer ${offer.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[P2P] Offer expiry handler error:", error);
  }
}

/**
 * Clean up old completed trades (archive)
 */
export async function archiveOldP2PTrades() {
  try {
    // Archive trades older than 90 days
    const ARCHIVE_DAYS = 90;
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - ARCHIVE_DAYS);

    const tradesToArchive = await models.p2pTrade.findAll({
      where: {
        status: {
          [Op.in]: ["COMPLETED", "CANCELLED", "EXPIRED"],
        },
        updatedAt: {
          [Op.lt]: archiveDate,
        },
        archived: {
          [Op.or]: [false, null],
        },
      },
      limit: 100, // Process in batches
    });

    console.log(`[P2P] Found ${tradesToArchive.length} trades to archive`);

    for (const trade of tradesToArchive) {
      try {
        // Move sensitive data to archive table or mark as archived
        await trade.update({
          archived: true,
          archivedAt: new Date(),
        });

        console.log(`[P2P] Archived trade ${trade.id}`);
      } catch (error) {
        console.error(`[P2P] Failed to archive trade ${trade.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[P2P] Trade archival error:", error);
  }
}

/**
 * Calculate and update user reputation scores
 */
export async function updateP2PReputationScores() {
  try {
    // Get all users with P2P activity in the last 30 days
    const activeUsers = await models.p2pTrade.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("buyerId")), "userId"],
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      raw: true,
    });

    const sellerIds = await models.p2pTrade.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("sellerId")), "userId"],
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      raw: true,
    });

    const allUserIds = [
      ...new Set([
        ...activeUsers.map((u: any) => u.userId),
        ...sellerIds.map((s: any) => s.userId),
      ]),
    ];

    console.log(`[P2P] Updating reputation for ${allUserIds.length} users`);

    for (const userId of allUserIds) {
      try {
        // Calculate user stats
        const completedTrades = await models.p2pTrade.count({
          where: {
            [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
            status: "COMPLETED",
          },
        });

        const totalTrades = await models.p2pTrade.count({
          where: {
            [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
            status: {
              [Op.ne]: "PENDING",
            },
          },
        });

        const disputedTrades = await models.p2pDispute.count({
          where: {
            [Op.or]: [{ reportedById: userId }, { againstId: userId }],
            status: "RESOLVED",
          },
        });

        const avgRating = await models.p2pReview.findOne({
          attributes: [
            [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"],
          ],
          where: {
            reviewedUserId: userId,
          },
          raw: true,
        });

        // Calculate reputation score (0-100)
        let reputationScore = 50; // Base score

        if (totalTrades > 0) {
          const completionRate = completedTrades / totalTrades;
          reputationScore += completionRate * 30; // Up to 30 points for completion rate
        }

        if (avgRating && avgRating.avgRating) {
          reputationScore += (avgRating.avgRating / 5) * 20; // Up to 20 points for ratings
        }

        // Deduct for disputes
        reputationScore -= Math.min(disputedTrades * 5, 20); // Max 20 point deduction

        // Ensure score is between 0 and 100
        reputationScore = Math.max(0, Math.min(100, Math.round(reputationScore)));

        // Update user's P2P profile or metadata
        // This would typically be stored in a separate p2pUserProfile table
        // For now, we'll log it
        console.log(`[P2P] User ${userId} reputation: ${reputationScore} (${completedTrades} completed, ${disputedTrades} disputes)`);

        // Check for milestones
        if (completedTrades === 10 || completedTrades === 50 || completedTrades === 100) {
          const { notifyReputationEvent } = await import("@b/api/(ext)/p2p/utils/notifications");
          notifyReputationEvent(userId, "REPUTATION_MILESTONE", {
            milestone: completedTrades,
            reputationScore,
          }).catch(console.error);
        }

      } catch (error) {
        console.error(`[P2P] Failed to update reputation for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error("[P2P] Reputation update error:", error);
  }
}

// Export for cron job registration
export const p2pJobs = {
  handleTradeTimeouts: {
    name: "p2p-trade-timeout",
    schedule: "*/5 * * * *", // Every 5 minutes
    handler: handleP2PTradeTimeouts,
  },
  archiveTrades: {
    name: "p2p-archive-trades",
    schedule: "0 2 * * *", // Daily at 2 AM
    handler: archiveOldP2PTrades,
  },
  updateReputation: {
    name: "p2p-update-reputation",
    schedule: "0 * * * *", // Every hour
    handler: updateP2PReputationScores,
  },
};