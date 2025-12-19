import { logger } from "@b/utils/console";
import { models } from "@b/db";

export async function getUserWalletByCurrency(
  userId: string,
  currency: string
): Promise<walletAttributes> {
  try {
    const wallet = await models.wallet.findOne({
      where: {
        userId,
        currency,
        type: "FUTURES",
      },
    });

    if (!wallet) {
      throw new Error(
        `Wallet not found for user ${userId} and currency ${currency}`
      );
    }

    return wallet;
  } catch (error) {
    logger.error("FUTURES", "Failed to get user wallet", error);
    throw error;
  }
}
