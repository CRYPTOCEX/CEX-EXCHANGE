import { models, sequelize } from "@b/db";
import { logError } from "@b/utils/logger";
import { broadcastStatus, broadcastLog } from "@b/utils/crons/broadcast";
import { Op } from "sequelize";

/**
 * Cron job to automatically expire NFT offers that have passed their expiration date
 * Run frequency: Every 5 minutes
 * Schedule: every 5 minutes
 */
export async function expireOffers() {
  const cronName = "expireOffers";
  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting offer expiration job");

    // Find all active offers that have expired
    const expiredOffers = await models.nftOffer.findAll({
      where: {
        status: "ACTIVE",
        expiresAt: {
          [Op.lte]: new Date(),
        },
      },
      include: [
        {
          model: models.nftToken,
          as: "token",
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: models.nftCollection,
          as: "collection",
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    if (expiredOffers.length === 0) {
      broadcastLog(cronName, "No expired offers found", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    broadcastLog(cronName, `Found ${expiredOffers.length} expired offers to process`);

    // Process each expired offer
    for (const offer of expiredOffers) {
      try {
        await sequelize.transaction(async (transaction) => {
          // Update offer status
          await offer.update(
            {
              status: "EXPIRED",
              expiredAt: new Date(),
            },
            { transaction }
          );

          // Create activity record
          await models.nftActivity.create({
            tokenId: offer.tokenId,
            collectionId: offer.collectionId,
            offerId: offer.id,
            type: offer.type === "TOKEN" ? "OFFER_EXPIRED" : "COLLECTION_OFFER_EXPIRED",
            fromUserId: offer.userId,
            toUserId: null,
            price: offer.amount,
            currency: offer.currency,
            transactionHash: null,
            metadata: JSON.stringify({
              offerType: offer.type,
              targetName: offer.token?.name || offer.collection?.name,
              originalExpiresAt: offer.expiresAt,
              expiredAt: new Date().toISOString(),
              expiredBy: "system_cron",
            }),
          }, { transaction });
        });

        processedCount++;
        broadcastLog(
          cronName,
          `Expired offer ${offer.id} for ${offer.token?.name || offer.collection?.name}`,
          "success"
        );

      } catch (error) {
        errorCount++;
        logError("cron_expire_offer", error, __filename);
        broadcastLog(
          cronName,
          `Error expiring offer ${offer.id}: ${error.message}`,
          "error"
        );
      }
    }

    const duration = Date.now() - startTime;
    broadcastStatus(cronName, "completed", {
      duration,
      processed: processedCount,
      errors: errorCount,
    });
    broadcastLog(
      cronName,
      `Offer expiration job completed: ${processedCount} processed, ${errorCount} errors`,
      "success"
    );

  } catch (error) {
    logError("cron_expire_offers_job", error, __filename);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      errors: errorCount + 1,
    });
    broadcastLog(
      cronName,
      `Offer expiration job failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

// Export for direct execution
export default expireOffers;
