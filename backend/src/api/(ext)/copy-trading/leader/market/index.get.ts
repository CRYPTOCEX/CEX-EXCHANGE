import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Get leader's declared markets",
  description: "Returns all markets the authenticated leader has declared for trading with follower counts",
  operationId: "getLeaderMarkets",
  tags: ["Copy Trading", "Leader"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get leader markets",
  responses: {
    200: {
      description: "Markets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                symbol: { type: "string" },
                baseCurrency: { type: "string" },
                quoteCurrency: { type: "string" },
                isActive: { type: "boolean" },
                followerCount: { type: "number" },
                createdAt: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "Leader profile not found" },
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Finding leader profile");
  const leader = await models.copyTradingLeader.findOne({
    where: { userId: user.id },
  });

  if (!leader) {
    throw createError({ statusCode: 404, message: "Leader profile not found" });
  }

  const leaderId = (leader as any).id;

  ctx?.step("Fetching leader markets");
  const markets = await models.copyTradingLeaderMarket.findAll({
    where: { leaderId },
    order: [["createdAt", "ASC"]],
  });

  ctx?.step("Fetching follower counts per market");
  // Get follower counts per market
  const followerCounts = await models.copyTradingFollowerAllocation.findAll({
    attributes: [
      "symbol",
      [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("copyTradingFollowerAllocation.followerId"))), "count"],
    ],
    where: { isActive: true },
    include: [
      {
        model: models.copyTradingFollower,
        as: "follower",
        where: { leaderId },
        attributes: [],
      },
    ],
    group: ["symbol"],
    raw: true,
  });

  // Create a map for quick lookup
  const countMap = new Map(
    (followerCounts as any[]).map((c) => [c.symbol, parseInt(c.count, 10)])
  );

  // Add follower count to each market
  const marketsWithCounts = markets.map((m) => {
    const market = m.toJSON() as any;
    market.followerCount = countMap.get(market.symbol) || 0;
    return market;
  });

  ctx?.success(`Retrieved ${markets.length} markets`);
  return marketsWithCounts;
};
