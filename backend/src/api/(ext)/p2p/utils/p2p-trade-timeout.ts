import { models, sequelize } from "@b/db";
import { fn, col, literal, Op } from "sequelize";
import { getWalletSafe } from "@b/api/finance/wallet/utils";
import { notifyTradeEvent } from "@b/api/(ext)/p2p/utils/notifications";
import { parseAmountConfig } from "@b/api/(ext)/p2p/utils/json-parser";
import { logger } from "@b/utils/console";

/**
 * LogContext interface for operation logging
 */
export interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

/**
 * P2P Trade Timeout Handler
 * This job runs periodically to handle expired trades
 */
export async function handleP2PTradeTimeouts(ctx?: LogContext) {
  try {
    ctx?.step?.("Starting P2P trade timeout handler");
    // Get default payment window setting (in minutes, default 30) as fallback
    const { CacheManager } = await import("@b/utils/cache");
    const cacheManager = CacheManager.getInstance();
    const defaultPaymentWindowMinutes = await cacheManager.getSetting("p2pDefaultPaymentWindow") || 30;

    // Find all trades that might have expired (we'll check each one individually)
    // We check trades older than 10 minutes (minimum reasonable timeout)
    const potentiallyExpiredCutoff = new Date();
    potentiallyExpiredCutoff.setMinutes(potentiallyExpiredCutoff.getMinutes() - 10);

    const potentiallyExpiredTrades = await models.p2pTrade.findAll({
      where: {
        status: {
          [Op.in]: ["PENDING", "PAYMENT_SENT"],
        },
        createdAt: {
          [Op.lt]: potentiallyExpiredCutoff,
        },
      },
      include: [
        {
          model: models.p2pOffer,
          as: "offer",
          attributes: ["id", "currency", "walletType", "userId", "tradeSettings"],
        },
      ],
    });

    // Filter to actually expired trades based on offer-specific timeout
    const expiredTrades = potentiallyExpiredTrades.filter((trade) => {
      const offerTimeout = trade.offer?.tradeSettings?.autoCancel || defaultPaymentWindowMinutes;
      const tradeAge = new Date().getTime() - new Date(trade.createdAt).getTime();
      const isExpired = tradeAge > (offerTimeout * 60 * 1000);
      return isExpired;
    });

    if (expiredTrades.length > 0) {
      ctx?.step?.(`Processing ${expiredTrades.length} expired trades`);
      logger.info("P2P", `Processing ${expiredTrades.length} expired trades`);
    }

    for (const trade of expiredTrades) {
      ctx?.step?.(`Processing expired trade ${trade.id}`);

      // Validate trade ID is a valid UUID before processing
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trade.id)) {
        logger.warn("P2P", `Invalid trade ID detected: ${trade.id}, deleting invalid trade`);
        try {
          await models.p2pTrade.destroy({ where: { id: trade.id }, force: true });
          logger.info("P2P", `Deleted invalid trade ${trade.id}`);
        } catch (deleteError) {
          logger.error("P2P", `Failed to delete invalid trade ${trade.id}`, deleteError);
        }
        continue;
      }

      const transaction = await sequelize.transaction();

      try {
        // Lock the trade
        const lockedTrade = await models.p2pTrade.findByPk(trade.id, {
          lock: true,
          transaction,
        });

        // Double-check status hasn't changed and trade is still expired
        const offerTimeout = trade.offer?.tradeSettings?.autoCancel || defaultPaymentWindowMinutes;
        const tradeAge = new Date().getTime() - new Date(lockedTrade.createdAt).getTime();
        const isStillExpired = tradeAge > (offerTimeout * 60 * 1000);

        if (!lockedTrade ||
            !["PENDING", "PAYMENT_SENT"].includes(lockedTrade.status) ||
            !isStillExpired) {
          await transaction.rollback();
          continue;
        }

        // If funds were locked (seller's funds), release them
        // This applies to ALL wallet types including FIAT
        if ((lockedTrade.status === "PENDING" || lockedTrade.status === "PAYMENT_SENT") && trade.offer) {
          try {
            const sellerWallet = await getWalletSafe(
              lockedTrade.sellerId,
              trade.offer.walletType,
              trade.offer.currency || lockedTrade.currency
            );

            if (sellerWallet) {
              // CRITICAL: Calculate safe unlock amount to prevent negative inOrder
              const safeUnlockAmount = Math.min(trade.amount, sellerWallet.inOrder);

              if (safeUnlockAmount > 0) {
                const newInOrder = Math.max(0, sellerWallet.inOrder - safeUnlockAmount);

                // Release locked funds
                await models.wallet.update({
                  inOrder: newInOrder,
                }, {
                  where: { id: sellerWallet.id },
                  transaction
                });

                logger.info("P2P", `Released ${safeUnlockAmount} ${trade.offer.currency || lockedTrade.currency} (${trade.offer.walletType}) for seller ${lockedTrade.sellerId}`);
                logger.debug("P2P", `Trade unlock details: amount=${trade.amount}, prevInOrder=${sellerWallet.inOrder}, newInOrder=${newInOrder}`);

                // Log warning if amounts don't match
                if (safeUnlockAmount < trade.amount) {
                  logger.warn("P2P", `Partial unlock - inOrder was less than trade amount: tradeId=${trade.id}, amount=${trade.amount}, available=${sellerWallet.inOrder}, unlocked=${safeUnlockAmount}`);
                }
              } else {
                logger.warn("P2P", `No funds to unlock - inOrder is already 0: tradeId=${trade.id}, amount=${trade.amount}, currentInOrder=${sellerWallet.inOrder}`);
              }
            }
          } catch (walletError) {
            logger.error("P2P", `Failed to release wallet funds for trade ${trade.id}`, walletError);
            // Continue with expiration even if fund release fails
          }
        }

        // Update trade status - ensure timeline is an array (might be string from DB)
        let timeline = lockedTrade.timeline || [];
        if (typeof timeline === "string") {
          try {
            timeline = JSON.parse(timeline);
          } catch {
            timeline = [];
          }
        }
        if (!Array.isArray(timeline)) {
          timeline = [];
        }
        timeline.push({
          event: "TRADE_EXPIRED",
          message: "Trade expired due to timeout",
          userId: null, // System-generated event
          createdAt: new Date().toISOString(),
        });

        await lockedTrade.update({
          status: "EXPIRED",
          timeline,
          expiredAt: new Date(),
        }, { transaction });

        // If offer was associated, restore the amount
        // CRITICAL: Validate against original total to prevent over-restoration
        if (trade.offerId) {
          const offer = await models.p2pOffer.findByPk(trade.offerId, {
            lock: true,
            transaction,
          });

          if (offer && offer.status === "ACTIVE") {
            // Parse amountConfig with robust parser
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

              logger.debug("P2P", `Restored offer amount: offerId=${offer.id}, tradeAmount=${trade.amount}, prevTotal=${amountConfig.total}, newTotal=${safeTotal}`);
            } else {
              logger.debug("P2P", `Skipped restoration - at or above limit: offerId=${offer.id}, currentTotal=${amountConfig.total}, max=${originalTotal}`);
            }
          }
        }

        // Log activity for both buyer and seller (non-critical, don't fail expiration if this fails)
        try {
          await models.p2pActivityLog.create({
            userId: trade.sellerId,
            type: "TRADE_EXPIRED",
            action: "EXPIRED",
            relatedEntity: "TRADE",
            relatedEntityId: trade.id,
            details: JSON.stringify({
              previousStatus: lockedTrade.status,
              amount: trade.amount,
              currency: trade.offer?.currency,
              buyerId: trade.buyerId,
              sellerId: trade.sellerId,
              systemGenerated: true,
            }),
          }, { transaction });
        } catch (activityLogError) {
          logger.warn("P2P", `Failed to create activity log for trade ${trade.id}, continuing with expiration`, activityLogError);
        }

        await transaction.commit();

        // Send notifications (non-blocking)
        notifyTradeEvent(trade.id, "TRADE_EXPIRED", {
          buyerId: trade.buyerId,
          sellerId: trade.sellerId,
          amount: trade.amount,
          currency: trade.offer.currency,
        }, ctx).catch((err) => logger.error("P2P", "Failed to notify trade event", err));

        ctx?.step?.(`Successfully expired trade ${trade.id}`);
        logger.info("P2P", `Successfully expired trade ${trade.id}`);
      } catch (error) {
        await transaction.rollback();
        logger.error("P2P", `Failed to expire trade ${trade.id}`, error);
      }
    }

    // Handle offers that need to expire
    await handleExpiredOffers(ctx);

    ctx?.success?.("P2P trade timeout handler completed successfully");
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Trade timeout handler error");
    logger.error("P2P", "Trade timeout handler error", error);
  }
}

/**
 * Handle expired offers
 */
async function handleExpiredOffers(ctx?: LogContext) {
  try {
    ctx?.step?.("Checking for expired offers");
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
        [Op.or]: [
          literal(`JSON_EXTRACT(\`amountConfig\`, '$.total') = 0`),
          literal(`JSON_EXTRACT(\`amountConfig\`, '$.total') IS NULL`),
          literal(`CAST(JSON_EXTRACT(\`amountConfig\`, '$.total') AS DECIMAL(36,18)) <= 0`),
        ],
      },
    });

    if (expiredOffers.length > 0) {
      ctx?.step?.(`Processing ${expiredOffers.length} expired offers`);
      logger.info("P2P", `Processing ${expiredOffers.length} expired offers`);
    }

    for (const offer of expiredOffers) {
      ctx?.step?.(`Processing expired offer ${offer.id}`);
      try {
        await offer.update({
          status: "EXPIRED",
          adminNotes: `Auto-expired due to inactivity and zero balance at ${new Date().toISOString()}`,
        });

        // Log activity for offer owner
        await models.p2pActivityLog.create({
          userId: offer.userId,
          type: "OFFER_EXPIRED",
          action: "EXPIRED",
          relatedEntity: "OFFER",
          relatedEntityId: offer.id,
          details: JSON.stringify({
            reason: "inactivity_and_zero_balance",
            lastUpdated: offer.updatedAt,
            systemGenerated: true,
          }),
        });

        // Notify user
        const { notifyOfferEvent } = await import("@b/api/(ext)/p2p/utils/notifications");
        notifyOfferEvent(offer.id, "OFFER_EXPIRED", {
          reason: "Inactivity and zero balance",
        }, ctx).catch((err) => logger.error("P2P", "Failed to notify offer event", err));

        ctx?.step?.(`Expired offer ${offer.id}`);
        logger.info("P2P", `Expired offer ${offer.id}`);
      } catch (error) {
        logger.error("P2P", `Failed to expire offer ${offer.id}`, error);
      }
    }

    ctx?.success?.("Expired offers handled successfully");
  } catch (error) {
    ctx?.fail?.((error as Error).message || "Offer expiry handler error");
    logger.error("P2P", "Offer expiry handler error", error);
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

    if (tradesToArchive.length > 0) {
      logger.info("P2P", `Archiving ${tradesToArchive.length} trades`);
    }

    for (const trade of tradesToArchive) {
      try {
        // Move sensitive data to archive table or mark as archived
        await trade.update({
          archived: true,
          archivedAt: new Date(),
        });

      } catch (error) {
        logger.error("P2P", `Failed to archive trade ${trade.id}`, error);
      }
    }
  } catch (error) {
    logger.error("P2P", "Trade archival error", error);
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
        [fn("DISTINCT", col("buyerId")), "userId"],
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
        [fn("DISTINCT", col("sellerId")), "userId"],
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

    if (allUserIds.length > 0) {
      logger.info("P2P", `Updating reputation for ${allUserIds.length} users`);
    }

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
            [fn("AVG", col("rating")), "avgRating"],
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

        // Check for milestones
        if (completedTrades === 10 || completedTrades === 50 || completedTrades === 100) {
          const { notifyReputationEvent } = await import("@b/api/(ext)/p2p/utils/notifications");
          notifyReputationEvent(userId, "REPUTATION_MILESTONE", {
            milestone: completedTrades,
            reputationScore,
          }).catch((err) => logger.error("P2P", "Failed to notify reputation event", err));
        }

      } catch (error) {
        logger.error("P2P", `Failed to update reputation for user ${userId}`, error);
      }
    }
  } catch (error) {
    logger.error("P2P", "Reputation update error", error);
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