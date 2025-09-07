import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, Op } from "sequelize";

// Metadata remains the same.
export const metadata = {
  summary: "Get Pool Analytics",
  description: "Retrieves analytics data for a specific staking pool.",
  operationId: "getPoolAnalytics",
  tags: ["Staking", "Admin", "Pools", "Analytics"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Pool ID",
    },
    {
      name: "timeRange",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["7d", "30d", "90d", "1y"] },
      description: "Time range for analytics data",
    },
  ],
  responses: {
    200: {
      description: "Pool analytics retrieved successfully",
      content: {
        "application/json": {
          schema: { type: "object" },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "Pool not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.staking.pool",
};

export default async (data: { user?: any; params?: any; query?: any }) => {
  const { user, params, query } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const poolId = params.id;
  if (!poolId) {
    throw createError({ statusCode: 400, message: "Pool ID is required" });
  }

  // Use the provided timeRange or default to "30d"
  const timeRange = query?.timeRange || "30d";
  const { startDate, endDate } = getTimeRangeDates(timeRange);

  try {
    // Check if the pool exists
    const pool = await models.stakingPool.findByPk(poolId);
    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    // Get time series data (staking, earnings, users) with proper aggregation
    const timeSeriesData = await getTimeSeriesData(
      poolId,
      startDate,
      endDate,
      timeRange
    );

    // Get metrics
    const metrics = await getMetrics(poolId);

    // Get distributions (note: now restricted to the given period)
    const distributions = await getDistributions(poolId, startDate, endDate);

    // Get performance data with proper aggregation (daily, weekly, or monthly)
    const performance = await getPerformance(
      poolId,
      startDate,
      endDate,
      timeRange
    );

    return {
      timeSeriesData,
      metrics,
      distributions,
      performance,
    };
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(`Error fetching analytics for pool ${poolId}:`, error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch pool analytics",
    });
  }
};

/**
 * Computes start and end dates for the given time range.
 */
function getTimeRangeDates(timeRange: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  let startDate: Date, endDate: Date;

  switch (timeRange) {
    case "7d": {
      // Assume week starts on Monday.
      const day = now.getDay(); // 0 (Sun) to 6 (Sat)
      const offset = (day + 6) % 7; // Convert so that Monday = 0
      startDate = new Date(now);
      startDate.setDate(now.getDate() - offset);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "30d": {
      // Use current month's boundaries.
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "90d": {
      // From start of month two months before current month to end of current month.
      let startMonth = now.getMonth() - 2;
      let startYear = now.getFullYear();
      if (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
      }
      startDate = new Date(startYear, startMonth, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "1y": {
      // Use current calendar year.
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    }
    default: {
      // Default to current month.
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
  }
  return { startDate, endDate };
}

/**
 * Fetches and aggregates time series data.
 * Depending on the timeRange, the function returns:
 * - Daily buckets for "7d" and "30d"
 * - Weekly buckets (aggregated from daily data) for "90d"
 * - Monthly buckets for "1y"
 */
async function getTimeSeriesData(
  poolId: string,
  startDate: Date,
  endDate: Date,
  timeRange: string
) {
  // Fetch aggregated daily data for staking, earnings, and unique users
  const stakingData = await models.stakingPosition.findAll({
    attributes: [
      [fn("DATE", col("createdAt")), "date"],
      [fn("SUM", col("amount")), "staked"],
    ],
    where: {
      poolId,
      createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
    },
    group: [fn("DATE", col("createdAt"))],
    raw: true,
  });

  const earningsData = await models.stakingEarningRecord.findAll({
    attributes: [
      [fn("DATE", col("stakingEarningRecord.createdAt")), "date"],
      [fn("SUM", col("stakingEarningRecord.amount")), "earnings"],
    ],
    include: [
      {
        model: models.stakingPosition,
        as: "position",
        attributes: [],
        where: { poolId },
      },
    ],
    where: {
      createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
    },
    group: [fn("DATE", col("stakingEarningRecord.createdAt"))],
    raw: true,
  });

  const usersData = await models.stakingPosition.findAll({
    attributes: [
      [fn("DATE", col("createdAt")), "date"],
      [fn("COUNT", fn("DISTINCT", col("userId"))), "users"],
    ],
    where: {
      poolId,
      createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
    },
    group: [fn("DATE", col("createdAt"))],
    raw: true,
  });

  // Create a map of daily buckets (YYYY-MM-DD) with default values 0.
  const dailyBucketsMap = new Map<
    string,
    { date: string; staked: number; earnings: number; users: number }
  >();
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    dailyBucketsMap.set(dateStr, {
      date: dateStr,
      staked: 0,
      earnings: 0,
      users: 0,
    });
    current.setDate(current.getDate() + 1);
  }

  // Merge staking data
  stakingData.forEach((item: any) => {
    const date = item.date;
    const bucket = dailyBucketsMap.get(date);
    if (bucket) {
      bucket.staked = Number.parseFloat(item.staked) || 0;
    }
  });

  // Merge earnings data
  earningsData.forEach((item: any) => {
    const date = item.date;
    const bucket = dailyBucketsMap.get(date);
    if (bucket) {
      bucket.earnings = Number.parseFloat(item.earnings) || 0;
    }
  });

  // Merge users data
  usersData.forEach((item: any) => {
    const date = item.date;
    const bucket = dailyBucketsMap.get(date);
    if (bucket) {
      bucket.users = Number.parseInt(item.users) || 0;
    }
  });

  // Convert the map to an array sorted by date
  const dailyBuckets = Array.from(dailyBucketsMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Aggregate buckets based on timeRange.
  if (timeRange === "7d" || timeRange === "30d") {
    return dailyBuckets;
  } else if (timeRange === "90d") {
    // Group daily data into weekly buckets (7-day groups).
    const weeklyBuckets: {
      date: string;
      staked: number;
      earnings: number;
      users: number;
    }[] = [];
    for (let i = 0; i < dailyBuckets.length; i += 7) {
      const weekSlice = dailyBuckets.slice(i, i + 7);
      const weekDate = weekSlice[0].date; // label the bucket by the first day
      const staked = weekSlice.reduce((sum, d) => sum + d.staked, 0);
      const earnings = weekSlice.reduce((sum, d) => sum + d.earnings, 0);
      const users = weekSlice.reduce((sum, d) => sum + d.users, 0);
      weeklyBuckets.push({ date: weekDate, staked, earnings, users });
    }
    return weeklyBuckets;
  } else if (timeRange === "1y") {
    // Group daily data into monthly buckets.
    const monthlyBuckets: {
      [key: string]: {
        date: string;
        staked: number;
        earnings: number;
        users: number;
      };
    } = {};
    dailyBuckets.forEach((item) => {
      const month = item.date.slice(0, 7); // YYYY-MM
      if (!monthlyBuckets[month]) {
        monthlyBuckets[month] = {
          date: month,
          staked: 0,
          earnings: 0,
          users: 0,
        };
      }
      monthlyBuckets[month].staked += item.staked;
      monthlyBuckets[month].earnings += item.earnings;
      monthlyBuckets[month].users += item.users;
    });
    return Object.values(monthlyBuckets).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }
}

/**
 * Fetches overall pool metrics.
 */
async function getMetrics(poolId: string) {
  // Active positions count
  const activePositionsCount = await models.stakingPosition.count({
    where: { poolId, status: "ACTIVE" },
  });

  // Total earnings
  const totalEarningsResult = await models.stakingEarningRecord.findOne({
    attributes: [
      [fn("SUM", col("stakingEarningRecord.amount")), "totalEarnings"],
    ],
    include: [
      {
        model: models.stakingPosition,
        as: "position",
        attributes: [],
        where: { poolId },
      },
    ],
    raw: true,
  });
  const totalEarnings =
    Number.parseFloat(totalEarningsResult?.totalEarnings) || 0;

  // Average stake amount
  const avgStakeAmountResult = await models.stakingPosition.findOne({
    attributes: [[fn("AVG", col("amount")), "avgStakeAmount"]],
    where: { poolId },
    raw: true,
  });
  const avgStakeAmount =
    Number.parseFloat(avgStakeAmountResult?.avgStakeAmount) || 0;

  // Expected APR from pool
  const poolData = await models.stakingPool.findByPk(poolId, {
    attributes: ["apr"],
    raw: true,
  });
  const expectedAPR = poolData?.apr || 0;

  // Calculate actual APR and efficiency from recent performance data
  const performanceData = await models.stakingExternalPoolPerformance.findAll({
    attributes: ["apr", "profit", "totalStaked"],
    where: { poolId },
    order: [["date", "DESC"]],
    limit: 10,
    raw: true,
  });

  let actualAPR = 0;
  let efficiency = 0;
  if (performanceData.length > 0) {
    actualAPR =
      performanceData.reduce(
        (sum, item) => sum + Number.parseFloat(item.apr),
        0
      ) / performanceData.length;
    efficiency = expectedAPR > 0 ? actualAPR / expectedAPR : 0;
  }

  return {
    activePositions: activePositionsCount,
    totalEarnings,
    avgStakeAmount,
    expectedAPR,
    actualAPR,
    efficiency,
  };
}

/**
 * Fetches distributions data with the date range applied.
 */
async function getDistributions(
  poolId: string,
  startDate: Date,
  endDate: Date
) {
  // Earnings distribution by amount ranges
  const earningsDistribution = [
    { name: "0-10", value: 0 },
    { name: "10-50", value: 0 },
    { name: "50-100", value: 0 },
    { name: "100-500", value: 0 },
    { name: "500+", value: 0 },
  ];

  // All earnings for this pool in the period
  const earningsData = await models.stakingEarningRecord.findAll({
    attributes: ["amount"],
    include: [
      {
        model: models.stakingPosition,
        as: "position",
        attributes: [],
        where: { poolId },
      },
    ],
    where: {
      createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
    },
    raw: true,
  });

  earningsData.forEach((item) => {
    const amount = Number.parseFloat(item.amount);
    if (amount <= 10) {
      earningsDistribution[0].value += 1;
    } else if (amount <= 50) {
      earningsDistribution[1].value += 1;
    } else if (amount <= 100) {
      earningsDistribution[2].value += 1;
    } else if (amount <= 500) {
      earningsDistribution[3].value += 1;
    } else {
      earningsDistribution[4].value += 1;
    }
  });

  // Earnings by type
  const earningsByTypeData = await models.stakingEarningRecord.findAll({
    attributes: [
      "type",
      [fn("SUM", col("stakingEarningRecord.amount")), "value"],
    ],
    include: [
      {
        model: models.stakingPosition,
        as: "position",
        attributes: [],
        where: { poolId },
      },
    ],
    where: {
      createdAt: { [Op.gte]: startDate, [Op.lte]: endDate },
    },
    group: ["type"],
    raw: true,
  });

  const earningsByType = earningsByTypeData.map((item) => ({
    name: item.type,
    value: Number.parseFloat(item.value) || 0,
  }));

  // User retention data (users with 1, 2, 3+ positions)
  const userPositionCounts = await models.stakingPosition.findAll({
    attributes: ["userId", [fn("COUNT", col("id")), "positionCount"]],
    where: { poolId },
    group: ["userId"],
    raw: true,
  });

  const userRetention = [
    { name: "1 Position", value: 0 },
    { name: "2 Positions", value: 0 },
    { name: "3+ Positions", value: 0 },
  ];
  userPositionCounts.forEach((item) => {
    const count = Number.parseInt(item.positionCount);
    if (count === 1) {
      userRetention[0].value += 1;
    } else if (count === 2) {
      userRetention[1].value += 1;
    } else {
      userRetention[2].value += 1;
    }
  });

  return {
    earningsDistribution,
    earningsByType,
    userRetention,
  };
}

/**
 * Fetches and aggregates performance data.
 * Returns:
 * - aprOverTime: { date, expectedAPR, actualAPR }
 * - efficiencyTrend: { date, efficiency }
 * The aggregation is done daily for "7d"/"30d", weekly for "90d", and monthly for "1y".
 */
async function getPerformance(
  poolId: string,
  startDate: Date,
  endDate: Date,
  timeRange: string
) {
  // Fetch raw performance data within the period.
  const performanceData = await models.stakingExternalPoolPerformance.findAll({
    attributes: ["date", "apr"],
    where: {
      poolId,
      date: { [Op.gte]: startDate, [Op.lte]: endDate },
    },
    order: [["date", "ASC"]],
    raw: true,
  });

  // Build a map of daily performance (keyed by YYYY-MM-DD)
  const dailyPerformanceMap = new Map<string, number>();
  performanceData.forEach((item) => {
    const dateStr = new Date(item.date).toISOString().split("T")[0];
    dailyPerformanceMap.set(dateStr, Number.parseFloat(item.apr) || 0);
  });

  // Create daily buckets for the entire period.
  const dailyBuckets: { date: string; apr: number }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    dailyBuckets.push({
      date: dateStr,
      apr: dailyPerformanceMap.get(dateStr) || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  // Fetch expected APR from pool (for consistency across buckets)
  const poolData = await models.stakingPool.findByPk(poolId, {
    attributes: ["apr"],
    raw: true,
  });
  const expectedAPR = poolData?.apr || 0;

  // Helper to create the output structure
  const formatOutput = (buckets: { date: string; apr: number }[]) => {
    const aprOverTime = buckets.map((item) => ({
      date: item.date,
      expectedAPR,
      actualAPR: item.apr,
    }));
    const efficiencyTrend = buckets.map((item) => ({
      date: item.date,
      efficiency: expectedAPR > 0 ? item.apr / expectedAPR : 0,
    }));
    return { aprOverTime, efficiencyTrend };
  };

  if (timeRange === "7d" || timeRange === "30d") {
    return formatOutput(dailyBuckets);
  } else if (timeRange === "90d") {
    // Aggregate into weekly buckets.
    const weeklyBuckets: { date: string; apr: number }[] = [];
    for (let i = 0; i < dailyBuckets.length; i += 7) {
      const weekSlice = dailyBuckets.slice(i, i + 7);
      const weekDate = weekSlice[0].date;
      const avgApr =
        weekSlice.reduce((sum, d) => sum + d.apr, 0) / weekSlice.length;
      weeklyBuckets.push({ date: weekDate, apr: avgApr });
    }
    return formatOutput(weeklyBuckets);
  } else if (timeRange === "1y") {
    // Aggregate into monthly buckets.
    const monthlyBuckets: {
      [key: string]: { date: string; sumApr: number; count: number };
    } = {};
    dailyBuckets.forEach((item) => {
      const month = item.date.slice(0, 7); // YYYY-MM
      if (!monthlyBuckets[month]) {
        monthlyBuckets[month] = { date: month, sumApr: 0, count: 0 };
      }
      monthlyBuckets[month].sumApr += item.apr;
      monthlyBuckets[month].count += 1;
    });
    const monthlyAggregates = Object.values(monthlyBuckets)
      .map((bucket) => ({
        date: bucket.date,
        apr: bucket.count > 0 ? bucket.sumApr / bucket.count : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return formatOutput(monthlyAggregates);
  }

  // Fallback in case timeRange doesn't match; return daily data.
  return formatOutput(dailyBuckets);
}
