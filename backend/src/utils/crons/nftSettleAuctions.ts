import { models, sequelize } from "@b/db";
import { logError } from "@b/utils/logger";
import { broadcastStatus, broadcastLog } from "@b/utils/crons/broadcast";
import { Op } from "sequelize";

// Safe import for NFT auction service (extension module)
let getNFTAuctionService: any;
try {
  const auctionServiceModule = require("../../api/(ext)/nft/utils/auction-service");
  getNFTAuctionService = auctionServiceModule.getNFTAuctionService;
} catch (e) {
  // NFT extension not available
}

/**
 * Cron job to automatically settle NFT auctions that have ended
 * Run frequency: Every 10 minutes
 * Schedule: every 10 minutes
 */
export async function settleAuctions() {
  const cronName = "settleAuctions";
  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;
  let noReserveCount = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting auction settlement job");

    // Find all active auctions that have ended
    const endedAuctions = await models.nftListing.findAll({
      where: {
        type: "AUCTION",
        status: "ACTIVE",
        endTime: {
          [Op.lte]: new Date(),
        },
      },
      include: [
        {
          model: models.nftToken,
          as: "token",
          attributes: ["id", "name", "image", "ownerId", "collectionId"],
          required: true,
          include: [
            {
              model: models.nftCollection,
              as: "collection",
              attributes: ["id", "name", "chain"],
            },
          ],
        },
        {
          model: models.nftBid,
          as: "bids",
          attributes: ["id", "amount", "userId", "status", "createdAt"],
          where: { status: "ACTIVE" },
          required: false,
          order: [["amount", "DESC"]],
          include: [
            {
              model: models.user,
              as: "user",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
        },
      ],
    });

    if (endedAuctions.length === 0) {
      broadcastLog(cronName, "No ended auctions found", "info");
      broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
      return;
    }

    broadcastLog(cronName, `Found ${endedAuctions.length} ended auctions to process`);

    // Process each ended auction
    for (const auction of endedAuctions) {
      try {
        const winningBid = auction.bids && auction.bids.length > 0 ? auction.bids[0] : null;

        // Check if reserve price was met
        if (auction.reservePrice && (!winningBid || winningBid.amount < auction.reservePrice)) {
          broadcastLog(
            cronName,
            `Auction ${auction.id} reserve price not met (${winningBid?.amount || 0} < ${auction.reservePrice})`,
            "warning"
          );

          await sequelize.transaction(async (transaction) => {
            await auction.update(
              {
                status: "EXPIRED",
                endedAt: new Date(),
              },
              { transaction }
            );

            await models.nftToken.update(
              { isListed: false },
              {
                where: { id: auction.tokenId },
                transaction,
              }
            );

            if (auction.bids && auction.bids.length > 0) {
              const bidIds = auction.bids.map(bid => bid.id);
              await models.nftBid.update(
                {
                  status: "REJECTED",
                  rejectedAt: new Date(),
                },
                {
                  where: { id: bidIds },
                  transaction,
                }
              );
            }

            await models.nftActivity.create({
              tokenId: auction.tokenId,
              listingId: auction.id,
              type: "AUCTION_ENDED",
              fromUserId: null,
              toUserId: auction.token.ownerId,
              price: winningBid?.amount || 0,
              currency: auction.currency,
              transactionHash: null,
              metadata: JSON.stringify({
                tokenName: auction.token.name,
                reservePriceNotMet: true,
                reservePrice: auction.reservePrice,
                highestBid: winningBid?.amount || 0,
                endedAt: new Date().toISOString(),
                endedBy: "system_cron",
              }),
            }, { transaction });
          });

          noReserveCount++;
          continue;
        }

        if (!winningBid) {
          broadcastLog(cronName, `Auction ${auction.id} ended with no bids`, "info");

          await sequelize.transaction(async (transaction) => {
            await auction.update(
              {
                status: "EXPIRED",
                endedAt: new Date(),
              },
              { transaction }
            );

            await models.nftToken.update(
              { isListed: false },
              {
                where: { id: auction.tokenId },
                transaction,
              }
            );

            await models.nftActivity.create({
              tokenId: auction.tokenId,
              listingId: auction.id,
              type: "AUCTION_ENDED",
              fromUserId: null,
              toUserId: auction.token.ownerId,
              price: 0,
              currency: auction.currency,
              transactionHash: null,
              metadata: JSON.stringify({
                tokenName: auction.token.name,
                noBids: true,
                endedAt: new Date().toISOString(),
                endedBy: "system_cron",
              }),
            }, { transaction });
          });

          processedCount++;
          continue;
        }

        // Settle auction with winning bid
        let blockchainResult: any = null;
        if (getNFTAuctionService && auction.auctionContractAddress && auction.token.collection?.chain) {
          try {
            const auctionService = await getNFTAuctionService(auction.token.collection.chain);
            blockchainResult = await auctionService.settleAuction(auction.auctionContractAddress);
            if (blockchainResult) {
              broadcastLog(
                cronName,
                `Settled auction ${auction.id} on blockchain: ${blockchainResult.transactionHash}`,
                "success"
              );
            }
          } catch (error) {
            logError("cron_settle_auction_blockchain", error, __filename);
            broadcastLog(
              cronName,
              `Blockchain settlement failed for auction ${auction.id}, continuing with database settlement`,
              "warning"
            );
          }
        }

        await sequelize.transaction(async (transaction) => {
          await auction.update(
            {
              status: "SOLD",
              soldAt: new Date(),
              endedAt: new Date(),
            },
            { transaction }
          );

          await winningBid.update(
            {
              status: "ACCEPTED",
              acceptedAt: new Date(),
            },
            { transaction }
          );

          if (auction.bids && auction.bids.length > 1) {
            const losingBidIds = auction.bids
              .filter(bid => bid.id !== winningBid.id)
              .map(bid => bid.id);

            if (losingBidIds.length > 0) {
              await models.nftBid.update(
                {
                  status: "REJECTED",
                  rejectedAt: new Date(),
                },
                {
                  where: { id: losingBidIds },
                  transaction,
                }
              );
            }
          }

          await models.nftToken.update(
            {
              ownerId: winningBid.userId,
              isListed: false,
            },
            {
              where: { id: auction.tokenId },
              transaction,
            }
          );

          await models.nftActivity.create({
            tokenId: auction.tokenId,
            listingId: auction.id,
            bidId: winningBid.id,
            type: "SALE",
            fromUserId: auction.token.ownerId,
            toUserId: winningBid.userId,
            price: winningBid.amount,
            currency: auction.currency,
            transactionHash: blockchainResult?.transactionHash || null,
            metadata: JSON.stringify({
              saleType: "auction",
              tokenName: auction.token.name,
              winningBid: winningBid.amount,
              totalBids: auction.bids?.length || 1,
              auctionEndTime: auction.endTime,
              settledAt: new Date().toISOString(),
              settledBy: "system_cron",
              ...(blockchainResult && {
                onChain: true,
                blockNumber: blockchainResult.blockNumber,
                gasUsed: blockchainResult.gasUsed,
              }),
            }),
          }, { transaction });

          await models.nftActivity.create({
            tokenId: auction.tokenId,
            listingId: auction.id,
            bidId: winningBid.id,
            type: "TRANSFER",
            fromUserId: auction.token.ownerId,
            toUserId: winningBid.userId,
            price: winningBid.amount,
            currency: auction.currency,
            transactionHash: blockchainResult?.transactionHash || null,
            metadata: JSON.stringify({
              transferType: "auction_settlement",
              tokenName: auction.token.name,
              settledAt: new Date().toISOString(),
              settledBy: "system_cron",
            }),
          }, { transaction });

          // NOTE: nftCollectionStats model doesn't exist - stats tracking disabled
          // await models.nftCollectionStats.increment(
          //   { owners: 1, totalVolume: winningBid.amount },
          //   {
          //     where: { collectionId: auction.token.collectionId },
          //     transaction,
          //   }
          // );

          await models.nftPriceHistory.create({
            tokenId: auction.tokenId,
            collectionId: auction.token?.collectionId || null,
            price: winningBid.amount,
            currency: auction.currency,
            saleType: "AUCTION",
            buyerId: winningBid.userId,
            sellerId: auction.sellerId,
          }, { transaction });
        });

        processedCount++;
        broadcastLog(
          cronName,
          `Settled auction ${auction.id}: Winner ${winningBid.user.firstName} ${winningBid.user.lastName} - ${winningBid.amount} ${auction.currency}`,
          "success"
        );

      } catch (error) {
        errorCount++;
        logError("cron_settle_auction", error, __filename);
        broadcastLog(
          cronName,
          `Error settling auction ${auction.id}: ${error.message}`,
          "error"
        );
      }
    }

    const duration = Date.now() - startTime;
    broadcastStatus(cronName, "completed", {
      duration,
      processed: processedCount,
      errors: errorCount,
      noReserve: noReserveCount,
    });
    broadcastLog(
      cronName,
      `Auction settlement job completed: ${processedCount} processed, ${noReserveCount} no reserve, ${errorCount} errors`,
      "success"
    );

  } catch (error) {
    logError("cron_settle_auctions_job", error, __filename);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      errors: errorCount + 1,
      noReserve: noReserveCount,
    });
    broadcastLog(
      cronName,
      `Auction settlement job failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

// Export for direct execution
export default settleAuctions;
