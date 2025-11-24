import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import { fn, col } from "sequelize";

export const metadata = {
  summary: "Update Staking Position",
  description:
    "Updates an existing staking position with the provided details.",
  operationId: "updateStakingPosition",
  tags: ["Staking", "Admin", "Positions"],
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
  requestBody: {
    description: "Updated staking position data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: { type: "number" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
            },
            withdrawalRequested: { type: "boolean" },
            withdrawalRequestDate: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            adminNotes: {
              type: "string",
              nullable: true,
            },
            completedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Position updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Position not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.staking.position",
};

export default async (data: { user?: any; params?: any; body?: any }) => {
  const { user, params, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const positionId = params.id;
  if (!positionId) {
    throw createError({ statusCode: 400, message: "Position ID is required" });
  }

  if (!body) {
    throw createError({ statusCode: 400, message: "Request body is required" });
  }

  try {
    // Find the position to update
    const position = await models.stakingPosition.findOne({
      where: { id: positionId },
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

    // Check if status is changing to COMPLETED
    const isCompletingPosition =
      position.status !== "COMPLETED" && body.status === "COMPLETED";

    // Update the position
    await position.update({
      ...body,
      // If completing the position, set completedAt to now if not provided
      completedAt:
        isCompletingPosition && !body.completedAt
          ? new Date()
          : body.completedAt,
    });

    // Reload the position with associations
    const updatedPosition = await models.stakingPosition.findOne({
      where: { id: positionId },
      include: [
        {
          model: models.stakingPool,
          as: "pool",
        },
        {
          model: models.stakingEarningRecord,
          as: "earningHistory",
          required: false,
        },
      ],
    });

    // Calculate additional properties
    const pendingRewardsResult = await models.stakingEarningRecord.findOne({
      attributes: [[fn("SUM", col("amount")), "pendingRewards"]],
      where: {
        positionId: position.id,
        isClaimed: false,
      },
      raw: true,
    });

    const pendingRewards = pendingRewardsResult?.pendingRewards || 0;

    const earningsToDateResult = await models.stakingEarningRecord.findOne({
      attributes: [[fn("SUM", col("amount")), "earningsToDate"]],
      where: {
        positionId: position.id,
      },
      raw: true,
    });

    const earningsToDate = earningsToDateResult?.earningsToDate || 0;

    const lastEarningRecord = await models.stakingEarningRecord.findOne({
      attributes: ["createdAt"],
      where: {
        positionId: position.id,
      },
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    const lastEarningDate = lastEarningRecord?.createdAt || null;

    // Create a notification for the user
    try {
      // Get user ID from the position
      const userId = position.userId;

      // Create notification based on the update type
      let title, message, details;

      if (isCompletingPosition) {
        title = "Staking Position Completed";
        message = `Your staking position in ${position.pool.name} has been completed.`;
        details =
          "Your staked amount and earnings are now available for withdrawal.";
      } else if (body.status === "CANCELLED") {
        title = "Staking Position Cancelled";
        message = `Your staking position in ${position.pool.name} has been cancelled.`;
        details = "Please contact support if you have any questions.";
      } else if (body.withdrawalRequested && !position.withdrawalRequested) {
        title = "Withdrawal Request Received";
        message = `Your withdrawal request for ${position.pool.name} has been received.`;
        details = "We are processing your request and will update you soon.";
      } else {
        title = "Staking Position Updated";
        message = `Your staking position in ${position.pool.name} has been updated.`;
        details = "Check your dashboard for the latest information.";
      }

      await createNotification({
        userId,
        relatedId: position.id,
        type: "system",
        title,
        message,
        details,
        link: `/staking/positions/${position.id}`,
        actions: [
          {
            label: "View Position",
            link: `/staking/positions/${position.id}`,
            primary: true,
          },
        ],
      });
    } catch (notifErr) {
      console.error(
        "Failed to create notification for position update",
        notifErr
      );
      // Continue execution even if notification fails
    }

    // Return position with computed properties
    return {
      ...updatedPosition.toJSON(),
      pendingRewards,
      earningsToDate,
      lastEarningDate,
      rewardTokenSymbol: updatedPosition.pool?.symbol,
      tokenSymbol: updatedPosition.pool?.symbol,
      poolName: updatedPosition.pool?.name,
      lockPeriodEnd: updatedPosition.endDate,
      apr: updatedPosition.pool?.apr,
    };
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(`Error updating staking position ${positionId}:`, error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};
