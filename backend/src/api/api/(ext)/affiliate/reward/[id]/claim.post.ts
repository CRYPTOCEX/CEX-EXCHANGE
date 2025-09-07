import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

// Conditional import for ecosystem wallet utility
let getWalletByUserIdAndCurrency: any;
try {
  const ecosystemWallet = require("@b/api/(ext)/ecosystem/utils/wallet");
  getWalletByUserIdAndCurrency = ecosystemWallet.getWalletByUserIdAndCurrency;
} catch (error) {
  // Ecosystem extension not available, will use fallback
  getWalletByUserIdAndCurrency = null;
}

export const metadata: OperationObject = {
  summary: "Claims a specific referral reward",
  description: "Processes the claim of a specified referral reward.",
  operationId: "claimReward",
  tags: ["MLM", "Rewards"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Referral reward UUID" },
    },
  ],
  responses: {
    200: {
      description: "Reward claimed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Success message" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Affiliate Reward"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, user } = data;
  const { id } = params;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const reward = await models.mlmReferralReward.findOne({
    where: { id, isClaimed: false, referrerId: user.id },
    include: [{ model: models.mlmReferralCondition, as: "condition" }],
  });

  if (!reward) throw new Error("Reward not found or already claimed");

  let updatedWallet: any;

  // Handle ECO wallet creation logic differently
  if (reward.condition.rewardWalletType === "ECO") {
    // Check if ecosystem extension is available
    if (getWalletByUserIdAndCurrency) {
      // Utilize ecosystem-specific wallet retrieval/creation logic
      updatedWallet = await getWalletByUserIdAndCurrency(
        user.id,
        reward.condition.rewardCurrency
      );
    } else {
      // Fallback to regular wallet creation for ECO type when ecosystem is not available
      const wallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency: reward.condition.rewardCurrency,
          type: "ECO",
        },
      });

      if (!wallet) {
        updatedWallet = await models.wallet.create({
          userId: user.id,
          currency: reward.condition.rewardCurrency,
          type: "ECO",
          status: true,
          balance: 0,
        });
      } else {
        updatedWallet = wallet;
      }
    }
  } else {
    // For non-ECO wallets, just find or create normally
    const wallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        currency: reward.condition.rewardCurrency,
        type: reward.condition.rewardWalletType,
      },
    });

    if (!wallet) {
      updatedWallet = await models.wallet.create({
        userId: user.id,
        currency: reward.condition.rewardCurrency,
        type: reward.condition.rewardWalletType,
        status: true,
        balance: 0,
      });
    } else {
      updatedWallet = wallet;
    }
  }

  if (!updatedWallet)
    throw new Error("Wallet not found or could not be created");

  await sequelize.transaction(async (transaction) => {
    // Re-check the reward status within the transaction to prevent race conditions
    const rewardToUpdate = await models.mlmReferralReward.findOne({
      where: { id, isClaimed: false, referrerId: user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!rewardToUpdate) {
      throw new Error("Reward not found or already claimed");
    }

    const newBalance = updatedWallet.balance + rewardToUpdate.reward;
    await updatedWallet.update({ balance: newBalance }, { transaction });

    await rewardToUpdate.update({ isClaimed: true }, { transaction });

    await models.transaction.create(
      {
        userId: user.id,
        walletId: updatedWallet.id,
        type: "REFERRAL_REWARD",
        status: "COMPLETED",
        amount: rewardToUpdate.reward,
        description: `Claimed referral reward for ${reward.condition?.type}`,
        metadata: JSON.stringify({ rewardId: rewardToUpdate.id }),
      },
      { transaction }
    );
  });

  return { message: "Reward claimed successfully" };
};
