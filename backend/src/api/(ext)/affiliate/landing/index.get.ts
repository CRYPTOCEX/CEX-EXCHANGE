import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { serverErrorResponse } from "@b/utils/query";
import { fn, col, Op, literal } from "sequelize";
import { CacheManager } from "@b/utils/cache";

export const metadata: OperationObject = {
  summary: "Get affiliate landing page data",
  description:
    "Retrieves comprehensive data for the affiliate landing page including stats, conditions, top affiliates, and recent activity.",
  operationId: "getAffiliateLanding",
  tags: ["Affiliate", "Landing"],
  logModule: "AFFILIATE",
  logTitle: "Get Landing Data",
  responses: {
    200: {
      description: "Affiliate landing page data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              stats: { type: "object" },
              conditions: { type: "array" },
              topAffiliates: { type: "array" },
              recentActivity: { type: "array" },
            },
          },
        },
      },
    },
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching Affiliate Landing Data");

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Execute all queries in parallel for performance
    const [
      totalAffiliatesCount,
      totalPaidOutResult,
      totalReferralsCount,
      activeReferralsCount,
      recentRewardsResult,
      conditions,
      topAffiliatesResult,
      recentRewards,
      avgReferralsResult,
    ] = await Promise.all([
      // Count unique affiliates who have made referrals
      models.mlmReferral.count({
        distinct: true,
        col: "referrerId",
      }),

      // Sum of all rewards paid out
      models.mlmReferralReward.findOne({
        attributes: [[fn("SUM", col("reward")), "total"]],
        raw: true,
      }),

      // Total number of referrals
      models.mlmReferral.count(),

      // Number of active referrals
      models.mlmReferral.count({
        where: { status: "ACTIVE" },
      }),

      // Sum of rewards in last 30 days for avg calculation
      models.mlmReferralReward.findOne({
        attributes: [
          [fn("SUM", col("reward")), "total"],
          [fn("COUNT", literal("DISTINCT referrerId")), "uniqueAffiliates"],
        ],
        where: {
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
        raw: true,
      }),

      // Active conditions
      models.mlmReferralCondition.findAll({
        where: { status: true },
        order: [
          ["type", "ASC"],
          ["reward", "DESC"],
        ],
      }),

      // Top affiliates by total earnings (anonymized)
      models.mlmReferralReward.findAll({
        attributes: [
          "referrerId",
          [fn("SUM", col("reward")), "totalEarnings"],
          [fn("COUNT", col("mlmReferralReward.id")), "rewardCount"],
        ],
        group: ["referrerId"],
        order: [[literal("totalEarnings"), "DESC"]],
        limit: 5,
        include: [
          {
            model: models.user,
            as: "referrer",
            attributes: ["id", "avatar", "createdAt"],
          },
        ],
        raw: false,
      }),

      // Recent reward activity
      models.mlmReferralReward.findAll({
        where: {
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
        include: [
          {
            model: models.mlmReferralCondition,
            as: "condition",
            attributes: ["type", "name", "rewardCurrency"],
          },
        ],
      }),

      // Average referrals per affiliate
      models.mlmReferral.findOne({
        attributes: [
          [
            literal(
              "COUNT(*) / NULLIF(COUNT(DISTINCT referrerId), 0)"
            ),
            "avgReferrals",
          ],
        ],
        raw: true,
      }),
    ]);

    // Calculate stats
    const totalPaidOut = parseFloat(totalPaidOutResult?.total) || 0;
    const recentRewardsTotal = parseFloat(recentRewardsResult?.total) || 0;
    const uniqueRecentAffiliates =
      parseInt(recentRewardsResult?.uniqueAffiliates) || 1;
    const avgMonthlyEarnings =
      uniqueRecentAffiliates > 0
        ? recentRewardsTotal / uniqueRecentAffiliates
        : 0;
    const successRate =
      totalReferralsCount > 0
        ? Math.round((activeReferralsCount / totalReferralsCount) * 100)
        : 0;
    const avgReferrals = parseFloat(avgReferralsResult?.avgReferrals) || 0;

    // Get top earning amount
    const topEarning =
      topAffiliatesResult.length > 0
        ? parseFloat(topAffiliatesResult[0].dataValues?.totalEarnings) || 0
        : 0;

    // Filter conditions based on available extensions
    ctx?.step("Filtering conditions based on available extensions");
    const cacheManager = CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();

    const conditionExtensionMap: { [key: string]: string } = {
      STAKING_LOYALTY: "staking",
      P2P_TRADE: "p2p",
      AI_INVESTMENT: "ai_investment",
      ICO_CONTRIBUTION: "ico",
      FOREX_INVESTMENT: "forex",
      ECOMMERCE_PURCHASE: "ecommerce",
    };

    const filteredConditions = conditions.filter((condition) => {
      const requiredExtension = conditionExtensionMap[condition.name];
      if (requiredExtension) {
        return extensions.has(requiredExtension);
      }
      return true;
    });

    // Map conditions to display format with categories
    const conditionsFormatted = filteredConditions.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      description: c.description,
      type: c.type,
      reward: c.reward,
      rewardType: c.rewardType,
      rewardCurrency: c.rewardCurrency,
      rewardWalletType: c.rewardWalletType,
      displayReward:
        c.rewardType === "PERCENTAGE"
          ? `${c.reward}%`
          : `${c.reward} ${c.rewardCurrency}`,
      category: getConditionCategory(c.type),
      icon: getConditionIcon(c.type),
    }));

    // Format top affiliates (anonymized)
    const topAffiliatesFormatted = topAffiliatesResult.map((a: any, index) => {
      const referrer = a.referrer || a.dataValues?.referrer;
      const referrerId = a.referrerId || a.dataValues?.referrerId;
      return {
        rank: index + 1,
        avatar: referrer?.avatar || null,
        displayName: `Affiliate #${String(referrerId).slice(-4).toUpperCase()}`,
        totalEarnings: parseFloat(a.dataValues?.totalEarnings) || 0,
        rewardCount: parseInt(a.dataValues?.rewardCount) || 0,
        joinedAgo: referrer?.createdAt
          ? getTimeAgo(new Date(referrer.createdAt))
          : "Unknown",
      };
    });

    // Format recent activity
    const recentActivityFormatted = recentRewards.slice(0, 8).map((r: any) => ({
      type: "reward_earned" as const,
      amount: r.reward,
      conditionType: r.condition?.type || "UNKNOWN",
      conditionName: r.condition?.name || "Reward",
      currency: r.condition?.rewardCurrency || "USD",
      timeAgo: getTimeAgo(new Date(r.createdAt)),
    }));

    // Get MLM system type from settings
    const mlmSetting = await models.settings.findOne({
      where: { key: "mlmSystem" },
    });
    const mlmSystem = mlmSetting?.value || "DIRECT";

    ctx?.success("Affiliate landing data retrieved successfully");

    return {
      stats: {
        totalAffiliates: totalAffiliatesCount,
        totalPaidOut: Math.round(totalPaidOut * 100) / 100,
        avgMonthlyEarnings: Math.round(avgMonthlyEarnings * 100) / 100,
        successRate,
        topEarning: Math.round(topEarning * 100) / 100,
        avgReferrals: Math.round(avgReferrals * 10) / 10,
      },
      conditions: conditionsFormatted,
      topAffiliates: topAffiliatesFormatted,
      recentActivity: recentActivityFormatted,
      mlmSystem,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error retrieving affiliate landing data: ${error.message}`,
    });
  }
};

function getConditionCategory(type: string): string {
  const categories: { [key: string]: string } = {
    TRADE: "Trading",
    DEPOSIT: "Deposits",
    INVESTMENT: "Investments",
    AI_INVESTMENT: "Investments",
    FOREX_INVESTMENT: "Investments",
    STAKING: "Staking",
    STAKING_LOYALTY: "Staking",
    ICO_CONTRIBUTION: "ICO",
    ECOMMERCE_PURCHASE: "E-commerce",
    P2P_TRADE: "P2P Trading",
    BINARY_WIN: "Network",
  };
  return categories[type] || "Other";
}

function getConditionIcon(type: string): string {
  const icons: { [key: string]: string } = {
    TRADE: "LineChart",
    DEPOSIT: "DollarSign",
    INVESTMENT: "TrendingUp",
    AI_INVESTMENT: "Bot",
    FOREX_INVESTMENT: "Globe",
    STAKING: "Coins",
    STAKING_LOYALTY: "Coins",
    ICO_CONTRIBUTION: "Rocket",
    ECOMMERCE_PURCHASE: "ShoppingBag",
    P2P_TRADE: "Users",
    BINARY_WIN: "Network",
  };
  return icons[type] || "Gift";
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}
