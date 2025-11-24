import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, col, literal } from "sequelize";

export const metadata = {
  summary: "Get Affiliate Dashboard Data",
  description:
    "Retrieves aggregated metrics for the affiliate admin dashboard.",
  operationId: "getAffiliateDashboard",
  tags: ["Affiliate", "Admin", "Stats"],
  requiresAuth: true,
  permission: "access.affiliate",
  responses: {
    200: { description: "Affiliate dashboard data retrieved successfully." },
    401: { description: "Unauthorized – Admin privileges required." },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: { user?: { id: string } }) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // 1. Total Affiliates (distinct referrers)
  const totalAffiliatesRow = await models.mlmReferral.findOne({
    attributes: [
      [fn("COUNT", literal("DISTINCT `referrerId`")), "totalAffiliates"],
    ],
    raw: true,
  });
  const totalAffiliates =
    parseInt(totalAffiliatesRow.totalAffiliates as any, 10) || 0;

  // 2. Total Referrals
  const totalReferrals = await models.mlmReferral.count();

  // 3. Referral Growth: this month vs last month
  const referralGrowth = await models.mlmReferral.findOne({
    attributes: [
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "currentReferrals",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "previousReferrals",
      ],
    ],
    raw: true,
  });
  const currentReferrals =
    parseInt(referralGrowth.currentReferrals as any, 10) || 0;
  const previousReferrals =
    parseInt(referralGrowth.previousReferrals as any, 10) || 0;
  const referralsChange =
    previousReferrals > 0
      ? Math.round(
          ((currentReferrals - previousReferrals) / previousReferrals) * 100
        )
      : 0;
  const referralsTrend = currentReferrals >= previousReferrals ? "up" : "down";

  // 4. Total Earnings
  const totalEarningsRow = await models.mlmReferralReward.findOne({
    attributes: [[fn("SUM", col("reward")), "totalEarnings"]],
    raw: true,
  });
  const totalEarnings = parseFloat(totalEarningsRow.totalEarnings as any) || 0;

  // 5. Earnings Growth (this month vs last month)
  const earningsGrowth = await models.mlmReferralReward.findOne({
    attributes: [
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN reward ELSE 0 END`
          )
        ),
        "currentEarnings",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN reward ELSE 0 END`
          )
        ),
        "previousEarnings",
      ],
    ],
    raw: true,
  });
  const currentEarnings =
    parseFloat(earningsGrowth.currentEarnings as any) || 0;
  const previousEarnings =
    parseFloat(earningsGrowth.previousEarnings as any) || 0;
  const earningsChange =
    previousEarnings > 0
      ? Math.round(
          ((currentEarnings - previousEarnings) / previousEarnings) * 100
        )
      : 0;
  const earningsTrend = currentEarnings >= previousEarnings ? "up" : "down";

  // 6. Conversion Rate: % of referrals resulting in at least one reward record
  const totalRewardRecords = await models.mlmReferralReward.count();
  const rewardCountGrowth = await models.mlmReferralReward.findOne({
    attributes: [
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "currentRewardCount",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "previousRewardCount",
      ],
    ],
    raw: true,
  });
  const currentRewardCount =
    parseInt(rewardCountGrowth.currentRewardCount as any, 10) || 0;
  const previousRewardCount =
    parseInt(rewardCountGrowth.previousRewardCount as any, 10) || 0;
  const thisMonthConversion =
    totalReferrals > 0
      ? Math.round((currentRewardCount / totalReferrals) * 100)
      : 0;
  const lastMonthConversion =
    totalReferrals > 0
      ? Math.round((previousRewardCount / totalReferrals) * 100)
      : 0;
  const conversionChange = lastMonthConversion
    ? thisMonthConversion - lastMonthConversion
    : 0;
  const conversionTrend =
    thisMonthConversion >= lastMonthConversion ? "up" : "down";

  const metrics = {
    totalAffiliates: {
      value: totalAffiliates,
      change: `${referralsChange}`,
      trend: referralsTrend,
    },
    totalReferrals: {
      value: totalReferrals,
      change: `${referralsChange}`,
      trend: referralsTrend,
    },
    totalEarnings: {
      value: totalEarnings,
      change: `${earningsChange}`,
      trend: earningsTrend,
    },
    conversionRate: {
      value: thisMonthConversion,
      change: `${conversionChange}`,
      trend: conversionTrend,
    },
  };

  // 7. Monthly Earnings Chart Data (last 12 months)
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  const earningsByMonthRaw = await models.mlmReferralReward.findAll({
    attributes: [
      [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
      [fn("SUM", col("reward")), "amount"],
    ],
    where: {
      createdAt: {
        [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 11, 1),
      },
    },
    group: ["month"],
    raw: true,
  });
  const earningsMap = earningsByMonthRaw.reduce(
    (acc: Record<string, number>, row: any) => {
      acc[row.month] = parseFloat(row.amount);
      return acc;
    },
    {}
  );
  const monthlyEarnings = months.map((month) => ({
    month,
    amount: earningsMap[month] || 0,
  }));

  // 8. Affiliate Status Distribution
  const statusRows = await models.mlmReferral.findAll({
    attributes: ["status", [fn("COUNT", literal("*")), "count"]],
    group: ["status"],
    raw: true,
  });
  const affiliateStatus = statusRows.map((row: any) => ({
    status: row.status,
    count: parseInt(row.count, 10),
  }));

  // 9. Top Affiliates
  const referralCounts = await models.mlmReferral.findAll({
    attributes: ["referrerId", [fn("COUNT", literal("*")), "referrals"]],
    group: ["referrerId"],
    raw: true,
  });
  const rewardCounts = await models.mlmReferralReward.findAll({
    attributes: [
      "referrerId",
      [fn("SUM", col("reward")), "earnings"],
      [fn("COUNT", literal("*")), "rewardCount"],
    ],
    group: ["referrerId"],
    raw: true,
  });
  const rewardMap = rewardCounts.reduce(
    (acc: Record<string, any>, row: any) => {
      acc[row.referrerId] = {
        earnings: parseFloat(row.earnings),
        rewardCount: parseInt(row.rewardCount, 10),
      };
      return acc;
    },
    {}
  );
  const affiliateIds = referralCounts.map((r) => r.referrerId);
  const users = await models.user.findAll({
    where: { id: affiliateIds },
    attributes: ["id", "firstName", "lastName"],
    raw: true,
  });
  const userMap = users.reduce((acc: Record<string, string>, u: any) => {
    acc[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return acc;
  }, {});
  const topAffiliates = referralCounts
    .map((r: any) => {
      const earnData = rewardMap[r.referrerId] || {
        earnings: 0,
        rewardCount: 0,
      };
      const conv = r.referrals
        ? Math.round((earnData.rewardCount / r.referrals) * 100)
        : 0;
      return {
        id: r.referrerId,
        name: userMap[r.referrerId] || r.referrerId,
        referrals: parseInt(r.referrals, 10),
        earnings: earnData.earnings,
        conversionRate: conv,
      };
    })
    .sort((a, b) => b.earnings - a.earnings);

  return {
    metrics,
    charts: { monthlyEarnings, affiliateStatus, topAffiliates },
  };
};
