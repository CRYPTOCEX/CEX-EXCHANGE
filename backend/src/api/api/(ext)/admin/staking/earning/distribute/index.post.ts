import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";

export const metadata = {
  summary: "Distribute Earnings",
  description:
    "Distributes earnings by splitting the given amount into admin fee and user earnings, and creates proper records for both.",
  operationId: "distributeEarnings",
  tags: ["Staking", "Admin", "Earnings"],
  requiresAuth: true,
  parameters: [],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            poolId: { type: "string" },
            amount: { type: "number" },
            distributionType: { type: "string", enum: ["regular", "bonus"] },
          },
          required: ["poolId", "amount", "distributionType"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Earnings distributed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "create.staking.earning",
};

export default async (data: { user?: any; body?: any }) => {
  const { user, body } = data;

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
    // Fetch the pool
    const pool = await models.stakingPool.findByPk(poolId, { transaction: t });
    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    // Calculate admin fee and user earnings
    const adminFee = parseFloat(
      ((amount * pool.adminFeePercentage) / 100).toFixed(4)
    );
    const userEarningTotal = parseFloat((amount - adminFee).toFixed(4));

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
      });
    } catch (notifErr) {
      console.error("Failed to create notification", notifErr);
    }

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
