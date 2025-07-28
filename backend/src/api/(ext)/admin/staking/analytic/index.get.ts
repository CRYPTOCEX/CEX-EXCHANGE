import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, Op, literal } from "sequelize";

export const metadata = {
  summary: "Get Staking Analytics",
  description:
    "Retrieves aggregated analytics data for the staking system, including total staked amounts, user counts, and performance metrics.",
  operationId: "getStakingAnalytics",
  tags: ["Staking", "Admin", "Analytics"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Analytics retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalStaked: { type: "number" },
              totalUsers: { type: "number" },
              totalPools: { type: "number" },
              stakingByToken: {
                type: "object",
                additionalProperties: { type: "number" },
              },
              stakingOverTime: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    amount: { type: "number" },
                  },
                },
              },
              stakedChangePercent: { type: "number" },
              usersChangePercent: { type: "number" },
              rewardsChangePercent: { type: "number" },
              activePoolsCount: { type: "number" },
              averageAPR: { type: "number" },
              totalRewardsDistributed: { type: "number" },
              totalAdminEarnings: { type: "number" },
              adminEarningsByPool: {
                type: "object",
                additionalProperties: { type: "number" },
              },
              averageUserROI: { type: "number" },
              earlyWithdrawalRate: { type: "number" },
              retentionRate: { type: "number" },
              poolPerformance: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    apr: { type: "number" },
                    profit: { type: "number" },
                    efficiency: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "access.staking",
};

export default async (data: { user?: any }) => {
  const { user } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Get total staked amount
    const totalStakedResult = await models.stakingPosition.findOne({
      attributes: [[fn("SUM", col("amount")), "totalStaked"]],
      where: {
        status: "ACTIVE",
      },
      raw: true,
    });

    const totalStaked = totalStakedResult?.totalStaked || 0;

    // Get total unique users
    const totalUsersResult = await models.stakingPosition.findOne({
      attributes: [[fn("COUNT", fn("DISTINCT", col("userId"))), "totalUsers"]],
      raw: true,
    });

    const totalUsers = totalUsersResult?.totalUsers || 0;

    // Get total pools
    const totalPoolsResult = await models.stakingPool.count({
      raw: true,
    });

    const totalPools = totalPoolsResult || 0;

    // Get active pools count
    const activePoolsResult = await models.stakingPool.count({
      where: {
        status: "ACTIVE",
      },
      raw: true,
    });

    const activePoolsCount = activePoolsResult || 0;

    // Get staking by token
    const stakingByTokenResult = await models.stakingPosition.findAll({
      attributes: [
        [col("pool.token"), "token"],
        [fn("SUM", col("stakingPosition.amount")), "amount"],
      ],
      include: [
        {
          model: models.stakingPool,
          as: "pool",
          attributes: [],
        },
      ],
      where: {
        status: "ACTIVE",
      },
      group: [col("pool.token")],
      raw: true,
    });

    const stakingByToken = stakingByTokenResult.reduce((acc, item) => {
      acc[item.token] = Number.parseFloat(item.amount);
      return acc;
    }, {});

    // Get total rewards distributed
    const totalRewardsResult = await models.stakingEarningRecord.findOne({
      attributes: [[fn("SUM", col("amount")), "totalRewards"]],
      raw: true,
    });

    const totalRewardsDistributed = totalRewardsResult?.totalRewards || 0;

    // Get total admin earnings
    const totalAdminEarningsResult = await models.stakingAdminEarning.findOne({
      attributes: [[fn("SUM", col("amount")), "totalAdminEarnings"]],
      where: {
        isClaimed: true,
      },
      raw: true,
    });

    const totalAdminEarnings =
      totalAdminEarningsResult?.totalAdminEarnings || 0;

    // Get admin earnings by pool
    const adminEarningsByPoolResult = await models.stakingAdminEarning.findAll({
      attributes: [
        [col("poolId"), "poolId"],
        [fn("SUM", col("amount")), "amount"],
      ],
      where: {
        isClaimed: true,
      },
      group: [col("poolId")],
      raw: true,
    });

    const adminEarningsByPool = adminEarningsByPoolResult.reduce(
      (acc, item) => {
        acc[item.poolId] = Number.parseFloat(item.amount);
        return acc;
      },
      {}
    );

    // Get average APR
    const averageAPRResult = await models.stakingPool.findOne({
      attributes: [[fn("AVG", col("apr")), "averageAPR"]],
      where: {
        status: "ACTIVE",
      },
      raw: true,
    });

    const averageAPR = averageAPRResult?.averageAPR || 0;

    // Calculate average user ROI
    const averageUserROI =
      totalStaked > 0 ? (totalRewardsDistributed / totalStaked) * 100 : 0;

    // Get pool performance data
    const poolPerformanceData =
      await models.stakingExternalPoolPerformance.findAll({
        attributes: [
          "poolId",
          [fn("AVG", col("apr")), "avgApr"],
          [fn("SUM", col("profit")), "totalProfit"],
        ],
        group: ["poolId"],
        raw: true,
      });

    // Get all pools for efficiency calculation
    const allPools = await models.stakingPool.findAll({
      attributes: {
        include: [
          "id",
          "apr",
          [
            // Subquery to sum all positions for each pool
            literal(`(
              SELECT COALESCE(SUM(sp.amount), 0)
              FROM staking_positions AS sp
              WHERE sp.poolId = stakingPool.id
            )`),
            "totalStaked",
          ],
        ],
      },
      raw: true,
    });

    // Calculate pool performance metrics
    const poolPerformance = {};
    allPools.forEach((pool) => {
      const performance = poolPerformanceData.find((p) => p.poolId === pool.id);

      if (performance) {
        const avgApr = Number.parseFloat(performance.avgApr);
        const totalProfit = Number.parseFloat(performance.totalProfit);
        const expectedProfit = pool.totalStaked * (avgApr / 100);
        const efficiency =
          expectedProfit > 0 ? totalProfit / expectedProfit : 0;

        poolPerformance[pool.id] = {
          apr: avgApr,
          profit: totalProfit,
          efficiency,
        };
      } else {
        poolPerformance[pool.id] = {
          apr: pool.apr,
          profit: 0,
          efficiency: 0,
        };
      }
    });

    // Get staking over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stakingOverTimeResult = await models.stakingPosition.findAll({
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("SUM", col("amount")), "amount"],
      ],
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true,
    });

    const stakingOverTime = stakingOverTimeResult.map((item) => ({
      date: item.date,
      amount: Number.parseFloat(item.amount),
    }));

    // Calculate change percentages (simplified - would need more data for accurate calculation)
    // In a real implementation, you would compare with previous period
    const stakedChangePercent = 0;
    const usersChangePercent = 0;
    const rewardsChangePercent = 0;

    // Calculate early withdrawal rate and retention rate
    // These would require more complex calculations in a real implementation
    const earlyWithdrawalRate = 0;
    const retentionRate = 0;

    return {
      totalStaked,
      totalUsers,
      totalPools,
      stakingByToken,
      stakingOverTime,
      stakedChangePercent,
      usersChangePercent,
      rewardsChangePercent,
      activePoolsCount,
      averageAPR,
      totalRewardsDistributed,
      totalAdminEarnings,
      adminEarningsByPool,
      averageUserROI,
      earlyWithdrawalRate,
      retentionRate,
      poolPerformance,
    };
  } catch (error) {
    console.error("Error fetching staking analytics:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch staking analytics",
    });
  }
};
