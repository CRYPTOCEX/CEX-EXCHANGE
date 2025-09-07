import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Manually distribute earnings for staking positions",
  operationId: "distributeStakingEarnings",
  tags: ["Admin", "Staking", "Earnings", "Distribute"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["poolId"],
          properties: {
            poolId: {
              type: "string",
              format: "uuid",
              description: "Pool ID to distribute earnings for"
            },
            positionIds: {
              type: "array",
              description: "Specific position IDs to process (optional, processes all active if not provided)",
              items: { type: "string", format: "uuid" }
            },
            dryRun: {
              type: "boolean",
              description: "If true, simulates the distribution without making changes",
              default: false
            },
            forceProcess: {
              type: "boolean",
              description: "If true, processes even if recently processed",
              default: false
            }
          }
        }
      }
    }
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
              processed: { type: "integer" },
              totalEarnings: { type: "number" },
              platformFees: { type: "number" },
              netEarnings: { type: "number" },
              dryRun: { type: "boolean" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    positionId: { type: "string" },
                    userId: { type: "string" },
                    amount: { type: "number" },
                    earnings: { type: "number" },
                    platformFee: { type: "number" },
                    netEarning: { type: "number" }
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
    404: { description: "Pool not found" },
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

  const { poolId, positionIds, dryRun = false, forceProcess = false } = body;

  // Validate pool ID
  if (!poolId || typeof poolId !== "string") {
    throw createError({
      statusCode: 400,
      message: "Valid pool ID is required"
    });
  }

  // Validate position IDs if provided
  if (positionIds && (!Array.isArray(positionIds) || positionIds.length === 0)) {
    throw createError({
      statusCode: 400,
      message: "positionIds must be a non-empty array if provided"
    });
  }

  if (positionIds && positionIds.length > 100) {
    throw createError({
      statusCode: 400,
      message: "Maximum 100 positions can be processed at once"
    });
  }

  const transaction = dryRun ? null : await sequelize.transaction();

  try {
    // Fetch the pool
    const pool = await models.stakingPool.findByPk(poolId, { transaction });
    
    if (!pool) {
      throw createError({ statusCode: 404, message: "Staking pool not found" });
    }

    if (pool.status !== "ACTIVE" && !forceProcess) {
      throw createError({
        statusCode: 400,
        message: "Pool is not active. Use forceProcess=true to override."
      });
    }

    // Build position query
    const positionQuery: any = {
      poolId,
      status: "ACTIVE"
    };

    if (positionIds) {
      positionQuery.id = { [Op.in]: positionIds };
    }

    // Check if recently processed (unless forced)
    if (!forceProcess) {
      const recentCutoff = new Date();
      recentCutoff.setHours(recentCutoff.getHours() - 1); // 1 hour cooldown

      const recentEarnings = await models.stakingEarningRecord.findOne({
        include: [{
          model: models.stakingPosition,
          as: "position",
          where: positionQuery,
          attributes: []
        }],
        where: {
          createdAt: { [Op.gte]: recentCutoff }
        },
        transaction
      });

      if (recentEarnings) {
        throw createError({
          statusCode: 400,
          message: "Earnings were recently distributed for this pool. Use forceProcess=true to override."
        });
      }
    }

    // Fetch positions to process
    const positions = await models.stakingPosition.findAll({
      where: positionQuery,
      include: [{
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"]
      }],
      transaction
    });

    if (positions.length === 0) {
      throw createError({
        statusCode: 404,
        message: "No active positions found to process"
      });
    }

    // Calculate earnings for each position
    const now = new Date();
    let totalEarnings = 0;
    let totalPlatformFees = 0;
    const details: any[] = [];

    for (const position of positions) {
      // Calculate days active
      const startDate = new Date(position.startDate);
      const daysActive = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysActive <= 0) {
        continue; // Skip positions that just started today
      }

      // Calculate daily earnings based on APR
      const dailyRate = pool.apr / 365 / 100;
      const earnings = position.amount * dailyRate * daysActive;
      
      // Calculate platform fee
      const platformFeeRate = pool.platformFeePercentage || 10; // Default 10%
      const platformFee = (earnings * platformFeeRate) / 100;
      const netEarning = earnings - platformFee;

      totalEarnings += earnings;
      totalPlatformFees += platformFee;

      details.push({
        positionId: position.id,
        userId: position.userId,
        amount: position.amount,
        earnings: Math.round(earnings * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        netEarning: Math.round(netEarning * 100) / 100
      });

      // Create earning records if not dry run
      if (!dryRun && netEarning > 0) {
        // Create user earning record
        await models.stakingEarningRecord.create({
          positionId: position.id,
          amount: netEarning,
          type: "REWARD",
          isClaimed: false,
          metadata: {
            daysActive,
            dailyRate,
            apr: pool.apr,
            distributedBy: user.id,
            distributionType: "MANUAL"
          }
        }, { transaction });

        // Create platform fee record
        if (platformFee > 0) {
          await models.stakingAdminEarning.create({
            poolId: pool.id,
            amount: platformFee,
            type: "PLATFORM_FEE",
            source: "MANUAL_DISTRIBUTION",
            metadata: {
              positionId: position.id,
              userId: position.userId,
              grossEarnings: earnings,
              feePercentage: platformFeeRate
            }
          }, { transaction });
        }
      }
    }

    // Create admin activity log
    if (!dryRun) {
      await models.stakingAdminActivity.create({
        userId: user.id,
        action: "distribute_earnings",
        type: "earnings",
        relatedId: poolId,
        metadata: {
          poolId,
          positionCount: positions.length,
          totalEarnings: Math.round(totalEarnings * 100) / 100,
          platformFees: Math.round(totalPlatformFees * 100) / 100,
          netEarnings: Math.round((totalEarnings - totalPlatformFees) * 100) / 100,
          positionIds: positions.map(p => p.id)
        }
      }, { transaction });
    }

    if (transaction) {
      await transaction.commit();
    }

    return {
      message: dryRun ? "Dry run completed - no changes made" : "Earnings distributed successfully",
      processed: details.length,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      platformFees: Math.round(totalPlatformFees * 100) / 100,
      netEarnings: Math.round((totalEarnings - totalPlatformFees) * 100) / 100,
      dryRun,
      details: dryRun ? details : undefined // Only show details in dry run
    };

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to distribute earnings"
    });
  }
};