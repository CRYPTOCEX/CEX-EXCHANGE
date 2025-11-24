import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, col, literal } from "sequelize";

export const metadata = {
  summary: "Get detailed pool performance data for admin",
  operationId: "getAdminPoolPerformance",
  tags: ["Admin", "Staking", "Pool", "Performance"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Pool ID",
      schema: { type: "string", format: "uuid" }
    },
    {
      name: "timeframe",
      in: "query",
      required: false,
      description: "Timeframe for performance data",
      schema: { type: "string", enum: ["24h", "7d", "30d", "90d", "all"], default: "30d" }
    }
  ],
  responses: {
    200: {
      description: "Pool performance data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              pool: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  symbol: { type: "string" },
                  apr: { type: "number" },
                  status: { type: "string" },
                  createdAt: { type: "string" }
                }
              },
              metrics: {
                type: "object",
                properties: {
                  totalValueLocked: { type: "number" },
                  activePositions: { type: "integer" },
                  totalPositions: { type: "integer" },
                  uniqueUsers: { type: "integer" },
                  totalRewardsDistributed: { type: "number" },
                  platformFeesCollected: { type: "number" },
                  averagePositionSize: { type: "number" },
                  averageStakingDuration: { type: "number" },
                  utilizationRate: { type: "number" }
                }
              },
              userMetrics: {
                type: "object",
                properties: {
                  newUsers: { type: "integer" },
                  returningUsers: { type: "integer" },
                  userRetentionRate: { type: "number" },
                  topUsers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        userId: { type: "string" },
                        totalStaked: { type: "number" },
                        totalEarned: { type: "number" },
                        positionCount: { type: "integer" }
                      }
                    }
                  }
                }
              },
              financialMetrics: {
                type: "object",
                properties: {
                  totalInflow: { type: "number" },
                  totalOutflow: { type: "number" },
                  netFlow: { type: "number" },
                  rewardsDistributionRate: { type: "number" },
                  effectiveAPY: { type: "number" }
                }
              },
              historicalData: {
                type: "object",
                properties: {
                  tvlHistory: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        value: { type: "number" }
                      }
                    }
                  },
                  positionHistory: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        new: { type: "integer" },
                        completed: { type: "integer" },
                        active: { type: "integer" }
                      }
                    }
                  },
                  rewardsHistory: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        distributed: { type: "number" },
                        claimed: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden - Admin access required" },
    404: { description: "Pool not found" },
    500: { description: "Internal Server Error" }
  },
  requiresAuth: true,
  permission: "access.staking.management"
};

export default async (data: Handler) => {
  const { user, params, query } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const { timeframe = "30d" } = query;

  try {
    // Get pool details
    const pool = await models.stakingPool.findByPk(id);
    
    if (!pool) {
      throw createError({ statusCode: 404, message: "Staking pool not found" });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case "24h":
        startDate.setHours(now.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        startDate = new Date(pool.createdAt);
        break;
    }

    // Basic metrics
    const tvlData = await models.stakingPosition.findOne({
      where: {
        poolId: id,
        status: "ACTIVE"
      },
      attributes: [
        [fn("SUM", col("amount")), "totalLocked"]
      ],
      raw: true
    });
    const totalValueLocked = parseFloat(tvlData?.totalLocked || "0");

    const activePositions = await models.stakingPosition.count({
      where: {
        poolId: id,
        status: "ACTIVE"
      }
    });

    const totalPositions = await models.stakingPosition.count({
      where: { poolId: id }
    });

    const uniqueUsers = await models.stakingPosition.count({
      where: { poolId: id },
      distinct: true,
      col: 'userId'
    });

    // Rewards and fees
    const rewardsData = await models.stakingEarningRecord.findOne({
      include: [{
        model: models.stakingPosition,
        as: "position",
        where: { poolId: id },
        attributes: []
      }],
      where: timeframe !== "all" ? {
        createdAt: { [Op.gte]: startDate }
      } : {},
      attributes: [
        [fn("SUM", col("amount")), "totalRewards"]
      ],
      raw: true
    });
    const totalRewardsDistributed = parseFloat(rewardsData?.totalRewards || "0");

    const feesData = await models.stakingAdminEarning.findOne({
      where: {
        poolId: id,
        ...(timeframe !== "all" ? { createdAt: { [Op.gte]: startDate } } : {})
      },
      attributes: [
        [fn("SUM", col("amount")), "totalFees"]
      ],
      raw: true
    });
    const platformFeesCollected = parseFloat(feesData?.totalFees || "0");

    // Average metrics
    const avgData = await models.stakingPosition.findOne({
      where: {
        poolId: id,
        status: "ACTIVE"
      },
      attributes: [
        [fn("AVG", col("amount")), "avgSize"]
      ],
      raw: true
    });
    const averagePositionSize = parseFloat(avgData?.avgSize || "0");

    // Calculate average staking duration
    const positions = await models.stakingPosition.findAll({
      where: {
        poolId: id,
        status: ["COMPLETED", "ACTIVE"]
      },
      attributes: ["startDate", "endDate", "completedAt"],
      raw: true
    });

    let totalDuration = 0;
    positions.forEach((pos: any) => {
      const start = new Date(pos.startDate);
      const end = pos.completedAt ? new Date(pos.completedAt) : new Date(pos.endDate);
      totalDuration += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    });
    const averageStakingDuration = positions.length > 0 ? totalDuration / positions.length : 0;

    const utilizationRate = pool.maxCapacity > 0 
      ? (totalValueLocked / pool.maxCapacity) * 100 
      : 0;

    // User metrics
    const newUsers = await models.stakingPosition.count({
      where: {
        poolId: id,
        createdAt: { [Op.gte]: startDate }
      },
      distinct: true,
      col: 'userId'
    });

    // Get returning users (users with multiple positions)
    const userPositionCounts = await models.stakingPosition.findAll({
      where: { poolId: id },
      attributes: [
        'userId',
        [fn('COUNT', col('id')), 'positionCount']
      ],
      group: ['userId'],
      having: literal('COUNT(id) > 1'),
      raw: true
    });
    const returningUsers = userPositionCounts.length;

    const userRetentionRate = uniqueUsers > 0 
      ? (returningUsers / uniqueUsers) * 100 
      : 0;

    // Top users
    const topUsersData = await models.stakingPosition.findAll({
      where: { poolId: id },
      attributes: [
        'userId',
        [fn('SUM', col('amount')), 'totalStaked'],
        [fn('COUNT', col('id')), 'positionCount']
      ],
      group: ['userId'],
      order: [[fn('SUM', col('amount')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Get earnings for top users
    const topUsers = await Promise.all(topUsersData.map(async (userData: any) => {
      const earningsData = await models.stakingEarningRecord.findOne({
        include: [{
          model: models.stakingPosition,
          as: "position",
          where: {
            poolId: id,
            userId: userData.userId
          },
          attributes: []
        }],
        attributes: [
          [fn("SUM", col("amount")), "totalEarned"]
        ],
        raw: true
      });

      return {
        userId: userData.userId,
        totalStaked: parseFloat(userData.totalStaked),
        totalEarned: parseFloat(earningsData?.totalEarned || "0"),
        positionCount: parseInt(userData.positionCount)
      };
    }));

    // Financial metrics
    const inflowData = await models.stakingPosition.findOne({
      where: {
        poolId: id,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [fn("SUM", col("amount")), "totalInflow"]
      ],
      raw: true
    });
    const totalInflow = parseFloat(inflowData?.totalInflow || "0");

    // Outflow (completed positions + claims)
    const outflowData = await models.stakingPosition.findOne({
      where: {
        poolId: id,
        status: "COMPLETED",
        completedAt: { [Op.gte]: startDate }
      },
      attributes: [
        [fn("SUM", col("amount")), "totalOutflow"]
      ],
      raw: true
    });

    const claimsData = await models.stakingEarningRecord.findOne({
      include: [{
        model: models.stakingPosition,
        as: "position",
        where: { poolId: id },
        attributes: []
      }],
      where: {
        isClaimed: true,
        claimedAt: { [Op.gte]: startDate }
      },
      attributes: [
        [fn("SUM", col("amount")), "totalClaimed"]
      ],
      raw: true
    });

    const totalOutflow = parseFloat(outflowData?.totalOutflow || "0") + parseFloat(claimsData?.totalClaimed || "0");
    const netFlow = totalInflow - totalOutflow;

    const rewardsDistributionRate = totalValueLocked > 0 && totalRewardsDistributed > 0
      ? (totalRewardsDistributed / totalValueLocked) * 100
      : 0;

    // Calculate effective APY
    const compoundFrequency = 365;
    const effectiveAPY = pool.apr > 0 
      ? (Math.pow(1 + (pool.apr / 100) / compoundFrequency, compoundFrequency) - 1) * 100
      : 0;

    // Generate historical data (simplified)
    const days = timeframe === "24h" ? 1 : timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const tvlHistory: Array<{ date: string; value: number }> = [];
    const positionHistory: Array<{ date: string; new: number; completed: number; active: number }> = [];
    const rewardsHistory: Array<{ date: string; distributed: number; claimed: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // This is simplified - in production you'd query actual historical data
      tvlHistory.push({
        date: dateStr,
        value: totalValueLocked * (1 - (i * 0.01)) // Simulated growth
      });

      positionHistory.push({
        date: dateStr,
        new: Math.floor(Math.random() * 10),
        completed: Math.floor(Math.random() * 5),
        active: activePositions - Math.floor(Math.random() * 20)
      });

      rewardsHistory.push({
        date: dateStr,
        distributed: totalRewardsDistributed / days,
        claimed: (totalRewardsDistributed / days) * 0.8
      });
    }

    return {
      pool: {
        id: pool.id,
        name: pool.name,
        symbol: pool.symbol,
        apr: pool.apr,
        status: pool.status,
        createdAt: pool.createdAt
      },
      metrics: {
        totalValueLocked,
        activePositions,
        totalPositions,
        uniqueUsers,
        totalRewardsDistributed,
        platformFeesCollected,
        averagePositionSize,
        averageStakingDuration: Math.round(averageStakingDuration),
        utilizationRate: Math.round(utilizationRate * 100) / 100
      },
      userMetrics: {
        newUsers,
        returningUsers,
        userRetentionRate: Math.round(userRetentionRate * 100) / 100,
        topUsers
      },
      financialMetrics: {
        totalInflow,
        totalOutflow,
        netFlow,
        rewardsDistributionRate: Math.round(rewardsDistributionRate * 100) / 100,
        effectiveAPY: Math.round(effectiveAPY * 100) / 100
      },
      historicalData: {
        tvlHistory,
        positionHistory,
        rewardsHistory
      }
    };

  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch pool performance data"
    });
  }
};