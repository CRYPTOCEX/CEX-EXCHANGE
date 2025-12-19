import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Distribute Earnings to Stakers",
  operationId: "distributeStakingEarnings",
  description:
    "Distributes earnings to all active stakers in a pool. The total amount is split into admin fees (based on pool's adminFeePercentage) and user earnings. Admin fees are recorded as a PLATFORM_FEE admin earning. User earnings are distributed proportionally to each active position based on their staked amount. Creates earning records for both admin and users, and logs the distribution activity.",
  tags: ["Admin", "Staking", "Earnings"],
  requiresAuth: true,
  logModule: "ADMIN_STAKE",
  logTitle: "Distribute Earnings",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            poolId: {
              type: "string",
              format: "uuid",
              description: "ID of the staking pool to distribute earnings for",
            },
            amount: {
              type: "number",
              minimum: 0,
              description: "Total amount to distribute (before admin fee)",
            },
            distributionType: {
              type: "string",
              enum: ["regular", "bonus"],
              description:
                "Type of distribution: 'regular' for standard earnings or 'bonus' for extra rewards",
            },
          },
          required: ["poolId", "amount", "distributionType"],
        },
      },
    },
  },
  responses: {
    200: successMessageResponse(
      "Earnings distributed successfully to all active stakers"
    ),
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Staking Pool"),
    500: serverErrorResponse,
  },
  permission: "create.staking.earning",
};

export default async (data: { user?: any; body?: any; ctx?: any }) => {
  const { user, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { poolId, amount, distributionType } = body;

  if (!poolId || !amount || !distributionType) {
    throw createError({
      statusCode: 400,
      message: "poolId, amount, and distributionType are required",
    });
  }

  if (!["regular", "bonus"].includes(distributionType)) {
    throw createError({
      statusCode: 400,
      message: "Invalid distributionType",
    });
  }

  const t = await sequelize.transaction();

  try {
    ctx?.step("Fetch pool");
    // Fetch the pool
    const pool = await models.stakingPool.findByPk(poolId, { transaction: t });
    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    ctx?.step("Calculate admin fee and user earnings");
    // Calculate admin fee and user earnings
    const adminFee = parseFloat(
      ((amount * pool.adminFeePercentage) / 100).toFixed(4)
    );
    const userEarningTotal = parseFloat((amount - adminFee).toFixed(4));

    ctx?.step("Create admin earning record");
    // Create the admin earning record
    await models.stakingAdminEarning.create(
      {
        poolId: pool.id,
        amount: adminFee,
        type: "PLATFORM_FEE",
        currency: pool.symbol,
        isClaimed: false,
      },
      { transaction: t }
    );

    ctx?.step("Get active staking positions");
    // Get active staking positions for the pool
    const positions = await models.stakingPosition.findAll({
      where: { poolId: pool.id, status: "ACTIVE" },
      transaction: t,
    });

    const totalStaked = positions.reduce((sum, pos) => sum + pos.amount, 0);
    if (totalStaked === 0) {
      throw createError({
        statusCode: 400,
        message: "No active positions found for distribution",
      });
    }

    ctx?.step("Distribute earnings to positions");
    // Determine the staking earning type from distributionType
    const earningType = distributionType.toUpperCase(); // "REGULAR" or "BONUS"

    // Create a staking earning record for each position proportional to its stake
    for (const pos of positions) {
      const positionShare = pos.amount / totalStaked;
      const positionEarning = parseFloat(
        (userEarningTotal * positionShare).toFixed(4)
      );

      // Create record only if there is a non-zero amount
      if (positionEarning > 0) {
        await models.stakingEarningRecord.create(
          {
            positionId: pos.id,
            amount: positionEarning,
            type: earningType,
            description: `Earnings distribution from pool ${pool.name}`,
            isClaimed: false,
          },
          { transaction: t }
        );
      }
    }

    ctx?.step("Log distribution activity");
    // Log the distribution activity
    await models.stakingAdminActivity.create(
      {
        userId: user.id,
        action: "distribute",
        type: "earnings",
        relatedId: pool.id,
      },
      { transaction: t }
    );

    await t.commit();

    // Optionally, create a notification for the admin
    try {
      await createNotification({
        userId: user.id,
        relatedId: pool.id,
        type: "system",
        title: "Earnings Distributed",
        message: `Distributed ${amount} ${pool.symbol}: Admin Fee ${adminFee}, User Earnings ${userEarningTotal}`,
        details: "Earnings distribution completed successfully.",
        link: `/admin/staking/earnings`,
        actions: [
          {
            label: "View Earnings",
            link: `/admin/staking/earnings`,
            primary: true,
          },
        ],
      }, ctx);
    } catch (notifErr) {
      console.error("Failed to create notification", notifErr);
    }

    ctx?.success("Earnings distributed successfully");
    return { message: "Earnings distributed successfully" };
  } catch (error) {
    await t.rollback();
    console.error("Error distributing earnings:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to distribute earnings",
    });
  }
};
