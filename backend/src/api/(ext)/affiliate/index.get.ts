import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { CacheManager } from "@b/utils/cache";
import { Op, fn, col, literal } from "sequelize";

export const metadata = {
  summary: "Get Affiliate Dashboard",
  description:
    "Retrieves dashboard data for the authenticated affiliate, with optional period filtering.",
  operationId: "getAffiliateDashboard",
  tags: ["Affiliate", "Dashboard"],
  requiresAuth: true,
  parameters: [
    {
      name: "period",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["1m", "3m", "6m", "1y"] },
    },
  ],
  responses: {
    200: { description: "Affiliate dashboard data retrieved successfully." },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

interface Handler {
  user?: { id: string };
  query?: { period?: string };
}

export default async function getAffiliateDashboard(data: Handler) {
  const userId = data.user?.id;
  if (!userId) throw createError({ statusCode: 401, message: "Unauthorized" });

  // parse period
  const period = data.query?.period || "6m";
  let monthsCount = 6;
  switch (period) {
    case "1m":
      monthsCount = 1;
      break;
    case "3m":
      monthsCount = 3;
      break;
    case "6m":
      monthsCount = 6;
      break;
    case "1y":
      monthsCount = 12;
      break;
  }

  const now = new Date();
  // compute start date for current period
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth() - (monthsCount - 1),
    1
  );
  // compute previous period boundaries
  const prevStart = new Date(
    now.getFullYear(),
    now.getMonth() - (2 * monthsCount - 1),
    1
  );
  const prevEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0);

  // load settings once
  const cache = CacheManager.getInstance();
  const rawSettings = await cache.getSettings();
  const requireApproval =
    rawSettings.get("referralApprovalRequired") === "true";
  const mlmSystem = rawSettings.get("mlmSystem") || "DIRECT";
  const binaryLevels = parseInt(rawSettings.get("binaryLevels") || "2", 10);
  const unilevelLevels = parseInt(rawSettings.get("unilevelLevels") || "2", 10);

  // stats for current and previous period in parallel
  const [
    totalReferrals,
    activeReferrals,
    pendingReferrals,
    rewardSum,
    recentCount,
    prevCountAll,
    rewardCount,
    prevTotalRef,
    prevActiveRef,
    prevPendingRef,
    prevRewardSumRaw,
    prevRewardCount,
  ] = await Promise.all([
    models.mlmReferral.count({ where: { referrerId: userId } }),
    models.mlmReferral.count({
      where: { referrerId: userId, status: "ACTIVE" },
    }),
    models.mlmReferral.count({
      where: { referrerId: userId, status: "PENDING" },
    }),
    models.mlmReferralReward.findOne({
      attributes: [[fn("SUM", col("reward")), "totalEarnings"]],
      where: { referrerId: userId },
      raw: true,
    }),
    models.mlmReferral.count({
      where: { referrerId: userId, createdAt: { [Op.gte]: startDate } },
    }),
    models.mlmReferral.count({
      where: { referrerId: userId, createdAt: { [Op.lte]: prevEnd } },
    }),
    models.mlmReferralReward.count({
      where: { referrerId: userId, createdAt: { [Op.gte]: startDate } },
    }),
    // previous stats
    models.mlmReferral.count({
      where: {
        referrerId: userId,
        createdAt: { [Op.between]: [prevStart, prevEnd] },
      },
    }),
    models.mlmReferral.count({
      where: {
        referrerId: userId,
        status: "ACTIVE",
        createdAt: { [Op.between]: [prevStart, prevEnd] },
      },
    }),
    models.mlmReferral.count({
      where: {
        referrerId: userId,
        status: "PENDING",
        createdAt: { [Op.between]: [prevStart, prevEnd] },
      },
    }),
    models.mlmReferralReward.findOne({
      attributes: [[fn("SUM", col("reward")), "amount"]],
      where: {
        referrerId: userId,
        createdAt: { [Op.between]: [prevStart, prevEnd] },
      },
      raw: true,
    }),
    models.mlmReferralReward.count({
      where: {
        referrerId: userId,
        createdAt: { [Op.between]: [prevStart, prevEnd] },
      },
    }),
  ]);

  const totalEarnings = parseFloat(rewardSum.totalEarnings) || 0;
  const weeklyGrowth =
    recentCount && prevCountAll > 0
      ? Math.round(((recentCount - prevCountAll) / prevCountAll) * 100)
      : 0;
  const conversionRate =
    totalReferrals > 0 ? Math.round((rewardCount / totalReferrals) * 100) : 0;
  const prevTotalEarnings = parseFloat(prevRewardSumRaw?.amount) || 0;
  const prevConversionRate =
    prevTotalRef > 0 ? Math.round((prevRewardCount / prevTotalRef) * 100) : 0;

  const stats = {
    totalReferrals,
    activeReferrals,
    pendingReferrals,
    conversionRate,
    totalEarnings,
    weeklyGrowth,
  };
  const previousStats = {
    totalReferrals: prevTotalRef,
    activeReferrals: prevActiveRef,
    pendingReferrals: prevPendingRef,
    conversionRate: prevConversionRate,
    totalEarnings: prevTotalEarnings,
  };

  // referrals filtered by current period & approval
  const referralsWhere: any = {
    referrerId: userId,
    createdAt: { [Op.gte]: startDate },
  };
  if (requireApproval) referralsWhere.status = "ACTIVE";
  const referrals = await models.mlmReferral.findAll({
    where: referralsWhere,
    include: [
      {
        model: models.user,
        as: "referred",
        attributes: ["firstName", "lastName", "email", "avatar"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // rewards full history
  const rewards = await models.mlmReferralReward.findAll({
    where: { referrerId: userId },
    include: [
      {
        model: models.mlmReferralCondition,
        as: "condition",
        attributes: ["name"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // monthly earnings for current period
  const months: string[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  const earningsRaw = await models.mlmReferralReward.findAll({
    attributes: [
      [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
      [fn("SUM", col("reward")), "amount"],
    ],
    where: { referrerId: userId, createdAt: { [Op.gte]: startDate } },
    group: ["month"],
    raw: true,
  });
  const earningsMap = Object.fromEntries(
    (earningsRaw as any[]).map((r) => [r.month, parseFloat(r.amount)])
  );
  const monthlyEarnings = months.map((m) => ({
    month: m,
    earnings: earningsMap[m] || 0,
  }));

  return { stats, referrals, rewards, monthlyEarnings };
}
