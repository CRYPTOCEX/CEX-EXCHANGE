import { models } from "@b/db";
import { fn, col, Op, literal } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get Staking landing page data",
  description:
    "Retrieves comprehensive data for the Staking landing page including stats, featured pools, token diversity, and activity.",
  operationId: "getStakingLanding",
  tags: ["Staking", "Landing"],
  requiresAuth: false,
  responses: {
    200: {
      description: "Staking landing page data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              stats: { type: "object" },
              featuredPools: { type: "array" },
              highestAprPools: { type: "array" },
              flexiblePools: { type: "array" },
              upcomingPools: { type: "array" },
              tokenStats: { type: "array" },
              recentActivity: { type: "array" },
              performance: { type: "object" },
              earningFrequencies: { type: "array" },
              calculatorPreview: { type: "object" },
            },
          },
        },
      },
    },
  },
};

export default async (data: Handler) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Execute all queries in parallel for performance
  const [
    poolStats,
    positionStats,
    earningStats,
    featuredPools,
    highestAprPools,
    flexiblePools,
    upcomingPools,
    tokenAggregates,
    recentPositions,
    recentClaims,
    earningFrequencyStats,
  ] = await Promise.all([
    // 1. Pool Statistics
    models.stakingPool.findOne({
      attributes: [
        [fn("COUNT", col("id")), "totalPools"],
        [
          fn(
            "SUM",
            literal("CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END")
          ),
          "activePools",
        ],
        [
          fn(
            "AVG",
            literal("CASE WHEN status = 'ACTIVE' THEN apr ELSE NULL END")
          ),
          "avgApr",
        ],
        [
          fn(
            "MAX",
            literal("CASE WHEN status = 'ACTIVE' THEN apr ELSE NULL END")
          ),
          "highestApr",
        ],
        [
          fn(
            "MIN",
            literal("CASE WHEN status = 'ACTIVE' THEN apr ELSE NULL END")
          ),
          "lowestApr",
        ],
        [
          fn(
            "AVG",
            literal("CASE WHEN status = 'ACTIVE' THEN lockPeriod ELSE NULL END")
          ),
          "avgLockPeriod",
        ],
      ],
      raw: true,
    }),

    // 2. Position Statistics
    models.stakingPosition.findOne({
      attributes: [
        [fn("SUM", col("amount")), "totalStaked"],
        [fn("COUNT", literal("DISTINCT userId")), "activeUsers"],
        [fn("AVG", col("amount")), "avgStakeAmount"],
        [
          fn(
            "SUM",
            literal("CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END")
          ),
          "completedPositions",
        ],
        [fn("COUNT", col("id")), "totalPositions"],
        // Growth metrics
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN amount ELSE 0 END`
            )
          ),
          "currentStaked",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN amount ELSE 0 END`
            )
          ),
          "previousStaked",
        ],
      ],
      where: { status: { [Op.in]: ["ACTIVE", "COMPLETED"] } },
      raw: true,
    }),

    // 3. Earning Statistics
    models.stakingEarningRecord.findOne({
      attributes: [
        [fn("SUM", col("amount")), "totalRewards"],
        [
          fn(
            "SUM",
            literal("CASE WHEN isClaimed = true THEN amount ELSE 0 END")
          ),
          "totalClaimed",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${sevenDaysAgo.toISOString()}' THEN amount ELSE 0 END`
            )
          ),
          "last7DaysRewards",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${thirtyDaysAgo.toISOString()}' THEN amount ELSE 0 END`
            )
          ),
          "last30DaysRewards",
        ],
      ],
      raw: true,
    }),

    // 4. Featured Pools (promoted, active)
    models.stakingPool.findAll({
      where: { status: "ACTIVE", isPromoted: true },
      order: [["order", "ASC"]],
      limit: 6,
    }),

    // 5. Highest APR Pools
    models.stakingPool.findAll({
      where: { status: "ACTIVE" },
      order: [["apr", "DESC"]],
      limit: 4,
    }),

    // 6. Flexible Pools (short lock periods)
    models.stakingPool.findAll({
      where: { status: "ACTIVE", lockPeriod: { [Op.lte]: 30 } },
      order: [["lockPeriod", "ASC"]],
      limit: 4,
    }),

    // 7. Coming Soon Pools
    models.stakingPool.findAll({
      where: { status: "COMING_SOON" },
      order: [["order", "ASC"]],
      limit: 3,
    }),

    // 8. Token Aggregates
    models.stakingPool.findAll({
      attributes: [
        "token",
        "symbol",
        "icon",
        [fn("COUNT", col("id")), "poolCount"],
        [fn("AVG", col("apr")), "avgApr"],
        [fn("MAX", col("apr")), "highestApr"],
      ],
      where: { status: "ACTIVE" },
      group: ["token", "symbol", "icon"],
      order: [[literal("poolCount"), "DESC"]],
      limit: 6,
      raw: true,
    }),

    // 9. Recent Positions (for activity feed)
    models.stakingPosition.findAll({
      attributes: ["amount", "createdAt", "poolId"],
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: models.stakingPool,
          as: "pool",
          attributes: ["name", "symbol"],
        },
      ],
    }),

    // 10. Recent Claims
    models.stakingEarningRecord.findAll({
      attributes: ["amount", "claimedAt", "positionId"],
      where: { isClaimed: true, claimedAt: { [Op.gte]: thirtyDaysAgo } },
      order: [["claimedAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: models.stakingPosition,
          as: "position",
          attributes: ["poolId"],
          include: [
            {
              model: models.stakingPool,
              as: "pool",
              attributes: ["name", "symbol"],
            },
          ],
        },
      ],
    }),

    // 11. Earning Frequency Stats
    models.stakingPool.findAll({
      attributes: [
        "earningFrequency",
        [fn("COUNT", col("id")), "poolCount"],
        [fn("AVG", col("apr")), "avgApr"],
      ],
      where: { status: "ACTIVE" },
      group: ["earningFrequency"],
      raw: true,
    }),
  ]);

  // Calculate stats
  const totalStaked = parseFloat((positionStats as any)?.totalStaked) || 0;
  const activeUsers = parseInt((positionStats as any)?.activeUsers) || 0;
  const totalPools = parseInt((poolStats as any)?.totalPools) || 0;
  const activePools = parseInt((poolStats as any)?.activePools) || 0;
  const avgApr = parseFloat((poolStats as any)?.avgApr) || 0;
  const highestApr = parseFloat((poolStats as any)?.highestApr) || 0;
  const lowestApr = parseFloat((poolStats as any)?.lowestApr) || 0;
  const avgLockPeriod = parseFloat((poolStats as any)?.avgLockPeriod) || 0;
  const avgStakeAmount =
    parseFloat((positionStats as any)?.avgStakeAmount) || 0;
  const completedPositions =
    parseInt((positionStats as any)?.completedPositions) || 0;
  const totalPositions =
    parseInt((positionStats as any)?.totalPositions) || 0;
  const completionRate =
    totalPositions > 0
      ? Math.round((completedPositions / totalPositions) * 100)
      : 0;

  const totalRewards = parseFloat((earningStats as any)?.totalRewards) || 0;
  const totalClaimed = parseFloat((earningStats as any)?.totalClaimed) || 0;
  const unclaimedRewards = totalRewards - totalClaimed;
  const last7DaysRewards =
    parseFloat((earningStats as any)?.last7DaysRewards) || 0;
  const last30DaysRewards =
    parseFloat((earningStats as any)?.last30DaysRewards) || 0;
  const avgDailyRewards = last30DaysRewards / 30;

  // Growth calculations
  const currentStaked =
    parseFloat((positionStats as any)?.currentStaked) || 0;
  const previousStaked =
    parseFloat((positionStats as any)?.previousStaked) || 0;
  const stakedGrowth =
    previousStaked > 0
      ? Math.round(((currentStaked - previousStaked) / previousStaked) * 100)
      : 0;

  // Get pool analytics for featured pools
  const featuredPoolIds = featuredPools.map((p: any) => p.id);
  const poolAnalytics =
    featuredPoolIds.length > 0
      ? await models.stakingPosition.findAll({
          attributes: [
            "poolId",
            [fn("SUM", col("amount")), "totalStaked"],
            [fn("COUNT", literal("DISTINCT userId")), "totalStakers"],
          ],
          where: {
            poolId: { [Op.in]: featuredPoolIds },
            status: { [Op.in]: ["ACTIVE", "COMPLETED"] },
          },
          group: ["poolId"],
          raw: true,
        })
      : [];
  const analyticsMap: Record<string, any> = {};
  poolAnalytics.forEach((a: any) => {
    analyticsMap[a.poolId] = a;
  });

  // Transform featured pools
  const transformedFeatured = featuredPools.map((pool: any) => {
    const analytics = analyticsMap[pool.id] || {};
    const poolTotalStaked = parseFloat(analytics.totalStaked) || 0;
    const totalCapacity = poolTotalStaked + pool.availableToStake;
    const capacity =
      totalCapacity > 0
        ? Math.round((poolTotalStaked / totalCapacity) * 100)
        : 0;

    return {
      id: pool.id,
      name: pool.name,
      symbol: pool.symbol,
      icon: pool.icon,
      description: pool.description,
      apr: pool.apr,
      lockPeriod: pool.lockPeriod,
      minStake: pool.minStake,
      maxStake: pool.maxStake,
      availableToStake: pool.availableToStake,
      totalStaked: poolTotalStaked,
      capacity,
      earningFrequency: pool.earningFrequency,
      autoCompound: pool.autoCompound,
      totalStakers: parseInt(analytics.totalStakers) || 0,
      walletType: pool.walletType,
    };
  });

  // Transform high APR pools
  const transformedHighApr = highestAprPools.map((pool: any) => ({
    id: pool.id,
    name: pool.name,
    symbol: pool.symbol,
    icon: pool.icon,
    apr: pool.apr,
    lockPeriod: pool.lockPeriod,
    earningFrequency: pool.earningFrequency,
  }));

  // Transform flexible pools
  const transformedFlexible = flexiblePools.map((pool: any) => ({
    id: pool.id,
    name: pool.name,
    symbol: pool.symbol,
    icon: pool.icon,
    apr: pool.apr,
    lockPeriod: pool.lockPeriod,
    earlyWithdrawalFee: pool.earlyWithdrawalFee,
  }));

  // Transform upcoming pools
  const transformedUpcoming = upcomingPools.map((pool: any) => ({
    id: pool.id,
    name: pool.name,
    symbol: pool.symbol,
    icon: pool.icon,
    description: pool.description,
    apr: pool.apr,
    lockPeriod: pool.lockPeriod,
  }));

  // Transform token stats
  const tokenStats = (tokenAggregates as any[]).map((t: any) => ({
    token: t.token,
    symbol: t.symbol,
    icon: t.icon,
    poolCount: parseInt(t.poolCount) || 0,
    avgApr: parseFloat(t.avgApr) || 0,
    highestApr: parseFloat(t.highestApr) || 0,
  }));

  // Build activity feed
  const recentActivity = [
    ...recentPositions.map((pos: any) => ({
      type: "STAKE" as const,
      amount: pos.amount,
      symbol: pos.pool?.symbol || "TOKEN",
      poolName: pos.pool?.name || "Pool",
      timeAgo: getTimeAgo(new Date(pos.createdAt)),
    })),
    ...recentClaims.map((claim: any) => ({
      type: "CLAIM" as const,
      amount: claim.amount,
      symbol: claim.position?.pool?.symbol || "TOKEN",
      poolName: claim.position?.pool?.name || "Pool",
      timeAgo: getTimeAgo(new Date(claim.claimedAt)),
    })),
  ]
    .sort((a, b) => a.timeAgo.localeCompare(b.timeAgo))
    .slice(0, 8);

  // Transform earning frequencies
  const earningFrequencies = (earningFrequencyStats as any[]).map(
    (f: any) => ({
      frequency: f.earningFrequency,
      poolCount: parseInt(f.poolCount) || 0,
      avgApr: parseFloat(f.avgApr) || 0,
    })
  );

  // Calculator preview
  const samplePool = highestAprPools[0] as any;
  const calculatorPreview = samplePool
    ? {
        samplePool: {
          name: samplePool.name,
          symbol: samplePool.symbol,
          apr: samplePool.apr,
        },
        examples: [
          {
            amount: 100,
            dailyReward: ((100 * samplePool.apr) / 100 / 365),
            monthlyReward: ((100 * samplePool.apr) / 100 / 12),
            yearlyReward: (100 * samplePool.apr) / 100,
          },
          {
            amount: 1000,
            dailyReward: ((1000 * samplePool.apr) / 100 / 365),
            monthlyReward: ((1000 * samplePool.apr) / 100 / 12),
            yearlyReward: (1000 * samplePool.apr) / 100,
          },
          {
            amount: 10000,
            dailyReward: ((10000 * samplePool.apr) / 100 / 365),
            monthlyReward: ((10000 * samplePool.apr) / 100 / 12),
            yearlyReward: (10000 * samplePool.apr) / 100,
          },
        ],
      }
    : null;

  return {
    stats: {
      totalStaked,
      activeUsers,
      totalPools,
      activePools,
      avgApr: Math.round(avgApr * 100) / 100,
      highestApr,
      lowestApr,
      totalRewards,
      totalClaimed,
      unclaimedRewards,
      stakedGrowth,
      usersGrowth: 0,
      rewardsGrowth: 0,
      avgLockPeriod: Math.round(avgLockPeriod),
      avgStakeAmount: Math.round(avgStakeAmount * 100) / 100,
      completionRate,
    },
    featuredPools: transformedFeatured,
    highestAprPools: transformedHighApr,
    flexiblePools: transformedFlexible,
    upcomingPools: transformedUpcoming,
    tokenStats,
    recentActivity,
    performance: {
      last7DaysRewards,
      last30DaysRewards,
      avgDailyRewards: Math.round(avgDailyRewards * 100) / 100,
      peakApr: highestApr,
      peakAprDate: null,
    },
    earningFrequencies,
    calculatorPreview,
  };
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
