import { expireOffers } from "@b/utils/crons/nftExpireOffers";

export const metadata = {
  summary: "Run offer expiration cron job",
  operationId: "cronExpireOffers",
  tags: ["Cron", "NFT"],
  description: "Expires all NFT offers that have passed their expiration date",
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
    await expireOffers();
    return { message: "Offer expiration job completed" };
  } catch (error) {
    return {
      message: "Offer expiration job failed",
      error: error.message,
    };
  }
};
