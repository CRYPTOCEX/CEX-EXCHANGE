import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Bulk update staking positions",
  operationId: "bulkUpdateStakingPositions",
  tags: ["Admin", "Staking", "Position", "Bulk"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["positionIds", "action"],
          properties: {
            positionIds: {
              type: "array",
              description: "Array of position IDs to update",
              items: { type: "string", format: "uuid" }
            },
            action: {
              type: "string",
              enum: ["PAUSE", "RESUME", "COMPLETE", "CANCEL"],
              description: "Action to perform on positions"
            },
            reason: {
              type: "string",
              description: "Optional reason for the action"
            }
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: "Positions updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              updated: { type: "integer" },
              failed: { type: "integer" },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    positionId: { type: "string" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    400: { description: "Invalid request data" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden - Admin access required" },
    500: { description: "Internal Server Error" }
  },
  requiresAuth: true,
  permission: "access.staking.management"
};

export default async (data: Handler) => {
  const { user, body } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { positionIds, action, reason } = body;

  // Validate input
  if (!Array.isArray(positionIds) || positionIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: "positionIds must be a non-empty array"
    });
  }

  if (positionIds.length > 100) {
    throw createError({
      statusCode: 400,
      message: "Maximum 100 positions can be updated at once"
    });
  }

  const validActions = ["PAUSE", "RESUME", "COMPLETE", "CANCEL"];
  if (!validActions.includes(action)) {
    throw createError({
      statusCode: 400,
      message: `Invalid action. Must be one of: ${validActions.join(", ")}`
    });
  }

  // Validate position IDs
  for (const id of positionIds) {
    if (!id || typeof id !== "string") {
      throw createError({
        statusCode: 400,
        message: "All position IDs must be valid strings"
      });
    }
  }

  const transaction = await sequelize.transaction();
  let updated = 0;
  const errors: Array<{ positionId: string; error: string }> = [];

  try {
    // Fetch all positions
    const positions = await models.stakingPosition.findAll({
      where: {
        id: {
          [Op.in]: positionIds
        }
      },
      include: [{
        model: models.stakingPool,
        as: "pool",
        attributes: ["id", "symbol", "walletType", "walletChain"]
      }],
      transaction
    });

    if (positions.length === 0) {
      throw createError({
        statusCode: 404,
        message: "No positions found with the provided IDs"
      });
    }

    // Process each position
    for (const position of positions) {
      try {
        const currentStatus = position.status;
        let newStatus = currentStatus;
        let shouldUpdate = false;

        switch (action) {
          case "PAUSE":
            if (currentStatus === "ACTIVE") {
              newStatus = "PAUSED";
              shouldUpdate = true;
            } else {
              errors.push({
                positionId: position.id,
                error: `Cannot pause position with status ${currentStatus}`
              });
            }
            break;

          case "RESUME":
            if (currentStatus === "PAUSED") {
              newStatus = "ACTIVE";
              shouldUpdate = true;
            } else {
              errors.push({
                positionId: position.id,
                error: `Cannot resume position with status ${currentStatus}`
              });
            }
            break;

          case "COMPLETE":
            if (["ACTIVE", "PAUSED"].includes(currentStatus)) {
              newStatus = "COMPLETED";
              shouldUpdate = true;

              // If completing, we need to handle the wallet refund
              const wallet = await models.wallet.findOne({
                where: {
                  userId: position.userId,
                  currency: position.pool.symbol,
                  type: position.pool.walletType || 'SPOT'
                },
                transaction
              });

              if (wallet) {
                // Return the staked amount to the user's wallet
                await wallet.increment('balance', {
                  by: position.amount,
                  transaction
                });

                // Create wallet transaction record
                await models.walletTransaction.create({
                  userId: position.userId,
                  walletId: wallet.id,
                  amount: position.amount,
                  type: 'DEPOSIT',
                  status: 'COMPLETED',
                  description: `Staking position ${position.id} completed - principal returned`,
                  metadata: {
                    source: 'STAKING_COMPLETE',
                    positionId: position.id,
                    reason: reason || 'Admin action'
                  }
                }, { transaction });
              }
            } else {
              errors.push({
                positionId: position.id,
                error: `Cannot complete position with status ${currentStatus}`
              });
            }
            break;

          case "CANCEL":
            if (!["COMPLETED", "CANCELLED"].includes(currentStatus)) {
              newStatus = "CANCELLED";
              shouldUpdate = true;

              // If cancelling, refund the staked amount
              const wallet = await models.wallet.findOne({
                where: {
                  userId: position.userId,
                  currency: position.pool.symbol,
                  type: position.pool.walletType || 'SPOT'
                },
                transaction
              });

              if (wallet) {
                // Return the staked amount to the user's wallet
                await wallet.increment('balance', {
                  by: position.amount,
                  transaction
                });

                // Create wallet transaction record
                await models.walletTransaction.create({
                  userId: position.userId,
                  walletId: wallet.id,
                  amount: position.amount,
                  type: 'DEPOSIT',
                  status: 'COMPLETED',
                  description: `Staking position ${position.id} cancelled - principal returned`,
                  metadata: {
                    source: 'STAKING_CANCEL',
                    positionId: position.id,
                    reason: reason || 'Admin action'
                  }
                }, { transaction });
              }
            } else {
              errors.push({
                positionId: position.id,
                error: `Cannot cancel position with status ${currentStatus}`
              });
            }
            break;
        }

        if (shouldUpdate) {
          await position.update({
            status: newStatus,
            ...(["COMPLETED", "CANCELLED"].includes(newStatus) && {
              completedAt: new Date()
            })
          }, { transaction });

          updated++;
        }

      } catch (error) {
        errors.push({
          positionId: position.id,
          error: error.message || "Failed to update position"
        });
      }
    }

    // Create admin activity log
    await models.stakingAdminActivity.create({
      userId: user.id,
      action: "bulk_update",
      type: "positions",
      relatedId: null,
      metadata: {
        action,
        positionCount: positionIds.length,
        updated,
        failed: errors.length,
        reason: reason || null,
        positionIds
      }
    }, { transaction });

    await transaction.commit();

    return {
      message: `Bulk position update completed`,
      updated,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    await transaction.rollback();
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to bulk update positions"
    });
  }
};