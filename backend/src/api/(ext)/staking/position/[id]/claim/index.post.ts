import { CacheManager } from "@b/utils/cache";
import { getTokenContractAddress } from "@b/api/(ext)/ecosystem/utils/tokens";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";
import { createNotification } from "@b/utils/notifications";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Claim Staking Position Earnings",
  description: "Claims all unclaimed earnings for a specific staking position.",
  operationId: "claimStakingPositionEarnings",
  tags: ["Staking", "Positions", "Earnings"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Position ID",
    },
  ],
  responses: {
    200: {
      description: "Earnings claimed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              claimedAmount: { type: "number" },
              transactionId: { type: "string" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden - Not position owner" },
    404: { description: "Position not found" },
    400: { description: "No earnings to claim" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  // Get the position
  const position = await models.stakingPosition.findOne({
    where: { id },
    include: [
      {
        model: models.stakingPool,
        as: "pool",
      },
    ],
  });

  if (!position) {
    throw createError({ statusCode: 404, message: "Position not found" });
  }

  // Verify ownership
  if (position.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: "You don't have access to this position",
    });
  }

  // Get unclaimed earnings
  const unclaimedEarnings = await models.stakingEarningRecord.findAll({
    where: {
      positionId: position.id,
      isClaimed: false,
    },
  });

  if (unclaimedEarnings.length === 0) {
    throw createError({ statusCode: 400, message: "No earnings to claim" });
  }

  // Calculate total amount to claim
  const totalClaimAmount = unclaimedEarnings.reduce(
    (sum, record) => sum + record.amount,
    0
  );

  let wallet = await models.wallet.findOne({
    where: {
      userId: user.id,
      currency: position.pool.symbol,
      type: position.pool.walletType,
    },
  });

  if (!wallet) {
    const cacheManager = CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    if (position.pool.walletType === "ECO") {
      if (!position.pool.walletChain)
        throw createError({
          statusCode: 400,
          message: "Chain not found in trade offer",
        });

      await getTokenContractAddress(position.pool.chain, position.pool.symbol);

      if (extensions.has("ecosystem")) {
        try {
          wallet = await getWalletByUserIdAndCurrency(
            user.id,
            position.pool.symbol
          );
        } catch (error) {
          console.error("Failed to create or retrieve wallet", error);
          throw createError({
            statusCode: 500,
            message:
              "Failed to create or retrieve wallet, please contact support",
          });
        }
      }
    } else {
      wallet = await models.wallet.create({
        userId: user.id,
        type: position.pool.walletType,
        currency: position.pool.symbol,
      });
    }
  }

  // Start a transaction
  const transaction = await sequelize.transaction();

  try {
    // Update all earnings as claimed
    await Promise.all(
      unclaimedEarnings.map((earning) =>
        models.stakingEarningRecord.update(
          {
            isClaimed: true,
            claimedAt: new Date(),
          },
          {
            where: { id: earning.id },
            transaction,
          }
        )
      )
    );

    // Create updated notification using the new format
    await createNotification({
      userId: user.id,
      relatedId: position.id,
      title: "Staking Rewards Claimed",
      message: `You have successfully claimed ${totalClaimAmount} ${position.pool.symbol} from your staking position.`,
      type: "system",
      link: `/staking/positions/${position.id}`,
      actions: [
        {
          label: "View Position",
          link: `/staking/positions/${position.id}`,
          primary: true,
        },
      ],
    });

    await transaction.commit();

    return {
      success: true,
      claimedAmount: totalClaimAmount,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
