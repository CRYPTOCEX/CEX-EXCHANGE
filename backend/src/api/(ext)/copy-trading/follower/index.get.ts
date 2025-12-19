// Get user's subscriptions/followings
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import { getEcoPriceInUSD } from "@b/api/finance/currency/utils";
import { getFollowerStats } from "@b/api/(ext)/copy-trading/utils/stats-calculator";

export const metadata = {
  summary: "Get My Copy Trading Subscriptions",
  description: "Retrieves all leaders the current user is following.",
  operationId: "getMyCopyTradingSubscriptions",
  tags: ["Copy Trading", "Followers"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get my subscriptions",
  parameters: [
    {
      name: "status",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["ACTIVE", "PAUSED", "STOPPED"] },
      description: "Filter by subscription status",
    },
  ],
  responses: {
    200: {
      description: "Subscriptions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: { type: "object" },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching subscriptions");
  const whereClause: any = { userId: user.id };

  if (query.status) {
    whereClause.status = query.status;
  } else {
    // By default, don't show stopped subscriptions
    whereClause.status = { [Op.ne]: "STOPPED" };
  }

  const subscriptions = await models.copyTradingFollower.findAll({
    where: whereClause,
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
      },
      {
        model: models.copyTradingFollowerAllocation,
        as: "allocations",
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  ctx?.step("Calculating stats and USDT totals for each subscription");
  // Calculate totalAllocatedUSDT and stats for each subscription
  const subscriptionsWithTotals = await Promise.all(
    subscriptions.map(async (s: any) => {
      const subData = s.toJSON();
      let totalAllocatedUSDT = 0;

      if (subData.allocations && subData.allocations.length > 0) {
        for (const alloc of subData.allocations) {
          if (!alloc.isActive) continue;

          try {
            // Extract base and quote currencies from symbol (e.g., "BTC/USDT" -> ["BTC", "USDT"])
            const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");

            // Get base currency price in USDT
            const basePrice = await getEcoPriceInUSD(baseCurrency);
            const baseInUSDT = parseFloat(alloc.baseAmount || 0) * basePrice;

            // Get quote currency price in USDT
            const quotePrice = await getEcoPriceInUSD(quoteCurrency);
            const quoteInUSDT = parseFloat(alloc.quoteAmount || 0) * quotePrice;

            totalAllocatedUSDT += baseInUSDT + quoteInUSDT;
          } catch (error) {
            // If price fetch fails, log and continue (allocation won't be counted)
            console.error(`Failed to get price for ${alloc.symbol}:`, error);
          }
        }
      }

      // Calculate follower stats (totalProfit, totalTrades, winRate, roi)
      // Uses Redis cache with 5min TTL for performance
      const stats = await getFollowerStats(subData.id);

      return {
        ...subData,
        totalAllocatedUSDT: Math.round(totalAllocatedUSDT * 100) / 100,
        ...stats, // Add calculated stats
      };
    })
  );

  ctx?.success(`Found ${subscriptions.length} subscriptions`);
  return subscriptionsWithTotals;
};
