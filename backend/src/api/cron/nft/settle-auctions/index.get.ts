import { settleAuctions } from "@b/utils/crons/nftSettleAuctions";

export const metadata = {
  summary: "Run auction settlement cron job",
  operationId: "cronSettleAuctions",
  tags: ["Cron", "NFT"],
  description: "Settles all NFT auctions that have ended",
  responses: {
    200: {
      description: "Cron job completed",
    },
    500: {
      description: "Error running cron job",
    },
  },
  requiresAuth: false, // Can be triggered by external cron service
};

export default async () => {
  try {
    await settleAuctions();
    return { message: "Auction settlement job completed" };
  } catch (error) {
    return {
      message: "Auction settlement job failed",
      error: error.message,
    };
  }
};
