import { CacheManager } from "@b/utils/cache";

// Safe import functions for ecosystem utilities
let ecosystemTokenUtils: any = null;
let ecosystemWalletUtils: any = null;
let ecosystemUtilsChecked = false;

async function safeImportEcosystemUtils() {
  if (!ecosystemUtilsChecked) {
    try {
      const tokenPath = `@b/api/(ext)/ecosystem/utils/tokens`;
      const walletPath = `@b/api/(ext)/ecosystem/utils/wallet`;
      const tokenModule = await import(tokenPath);
      const walletModule = await import(walletPath);
      ecosystemTokenUtils = tokenModule;
      ecosystemWalletUtils = walletModule;
    } catch (error) {
      // Ecosystem addon not available
      ecosystemTokenUtils = null;
      ecosystemWalletUtils = null;
    }
    ecosystemUtilsChecked = true;
  }
  return {
    tokenUtils: ecosystemTokenUtils,
    walletUtils: ecosystemWalletUtils,
  };
}
import { createNotification } from "@b/utils/notifications";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Claim Staking Position Earnings",
  description: "Claims all unclaimed earnings for a specific staking position.",
  operationId: "claimStakingPositionEarnings",
  tags: ["Staking", "Positions", "Earnings"],
  requiresAuth: true,
  rateLimit: {
    windowMs: 3600000, // 1 hour
    max: 10 // 10 claims per hour
  },
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

/**
 * Claims all unclaimed earnings for a staking position.
 * 
 * @description This endpoint processes earnings claims for staking positions.
 * It performs the following operations:
 * - Validates position ownership
 * - Retrieves all unclaimed earnings
 * - Credits earnings to user's wallet
 * - Marks earnings as claimed
 * - Creates transaction records for audit
 * - Sends notification to user
 * 
 * Rate limited to 10 claims per hour per user.
 * 
 * @param {Handler} data - Request handler data
 * @param {User} data.user - Authenticated user
 * @param {Object} data.params - Route parameters
 * @param {string} data.params.id - Position ID to claim earnings from
 * 
 * @returns {Promise<{success: boolean, claimedAmount: number}>} Claim result
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the position
 * @throws {404} Not Found - Position not found
 * @throws {400} Bad Request - No earnings to claim
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Transaction failed
 */
export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  
  // Validate position ID
  if (!id || typeof id !== "string") {
    throw createError({ statusCode: 400, message: "Valid position ID is required" });
  }

  // Rate limiting check for claims
  const recentClaims = await models.stakingEarningRecord.count({
    where: {
      positionId: {
        [Op.in]: sequelize.literal(`(
          SELECT id FROM staking_position WHERE userId = '${user.id}'
        )`)
      },
      isClaimed: true,
      claimedAt: {
        [Op.gte]: new Date(Date.now() - 3600000) // Last hour
      }
    }
  });
  
  if (recentClaims >= 10) {
    throw createError({
      statusCode: 429,
      message: "Too many claim requests. Please wait before trying again."
    });
  }

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

      // Try to use ecosystem utils if available
      const { tokenUtils, walletUtils } = await safeImportEcosystemUtils();
      
      if (tokenUtils && walletUtils && extensions.has("ecosystem")) {
        try {
          // Check token contract address
          await tokenUtils.getTokenContractAddress(position.pool.walletChain, position.pool.symbol);
          
          // Get or create ecosystem wallet
          wallet = await walletUtils.getWalletByUserIdAndCurrency(
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
      } else {
        // Fallback: create a basic ECO wallet without ecosystem functionality
        wallet = await models.wallet.create({
          userId: user.id,
          type: position.pool.walletType,
          currency: position.pool.symbol,
          balance: 0,
        });
      }
    } else {
      wallet = await models.wallet.create({
        userId: user.id,
        type: position.pool.walletType,
        currency: position.pool.symbol,
        balance: 0,
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

    // Credit the wallet with the claimed earnings
    await wallet.increment('balance', {
      by: totalClaimAmount,
      transaction
    });

    // Create wallet transaction record for audit trail
    await models.walletTransaction.create({
      userId: user.id,
      walletId: wallet.id,
      amount: totalClaimAmount,
      type: 'DEPOSIT',
      status: 'COMPLETED',
      description: `Staking rewards claim from position ${position.id}`,
      metadata: {
        source: 'STAKING_CLAIM',
        positionId: position.id,
        earningIds: unclaimedEarnings.map(e => e.id)
      }
    }, { transaction });

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
