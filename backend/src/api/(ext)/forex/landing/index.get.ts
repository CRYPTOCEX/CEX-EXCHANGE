import { models } from "@b/db";
import { Op, fn, col, literal } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get Forex Landing Page Data",
  description:
    "Retrieves optimized data for the forex landing page including stats, featured plans, performance history, and recent completions.",
  operationId: "getForexLandingData",
  tags: ["Forex", "Landing"],
  requiresAuth: false,
  responses: {
    200: {
      description: "Forex landing data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              stats: { type: "object" },
              featuredPlans: { type: "array" },
              topPerformingPlan: { type: "object" },
              performanceHistory: { type: "array" },
              signals: { type: "array" },
              recentCompletions: { type: "array" },
              durationOptions: { type: "object" },
            },
          },
        },
      },
    },
  },
};

const ACTIVE_STATUS = ["ACTIVE"];
const COMPLETED_STATUS = ["COMPLETED"];

export default async (data: Handler) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    activeInvestors,
    totalInvestedResult,
    completedInvestments,
    activeInvestments,
    winCountResult,
    totalCompletedResult,
    profitResult,
    featuredPlans,
    signals,
    recentCompletions,
    durations,
  ] = await Promise.all([
    // Active investors count
    models.forexInvestment.count({
      distinct: true,
      col: "userId",
      where: { status: { [Op.in]: ACTIVE_STATUS } },
    }),

    // Total invested
    models.forexInvestment.sum("amount"),

    // Completed investments
    models.forexInvestment.count({
      where: { status: { [Op.in]: COMPLETED_STATUS } },
    }),

    // Active investments
    models.forexInvestment.count({
      where: { status: { [Op.in]: ACTIVE_STATUS } },
    }),

    // Win count for win rate
    models.forexInvestment.count({
      where: {
        status: { [Op.in]: COMPLETED_STATUS },
        result: "WIN",
      },
    }),

    // Total completed for win rate calc
    models.forexInvestment.count({
      where: { status: { [Op.in]: COMPLETED_STATUS } },
    }),

    // Total profit and average return
    models.forexInvestment.findOne({
      attributes: [
        [fn("SUM", col("profit")), "totalProfit"],
        [
          fn(
            "AVG",
            literal(
              "CASE WHEN amount > 0 THEN (profit / amount) * 100 ELSE NULL END"
            )
          ),
          "avgReturn",
        ],
      ],
      where: { status: { [Op.in]: COMPLETED_STATUS } },
      raw: true,
    }),

    // Featured/trending plans with investment stats
    models.forexPlan.findAll({
      where: { status: true },
      include: [
        {
          model: models.forexDuration,
          as: "durations",
          through: { attributes: [] },
        },
      ],
      order: [
        ["trending", "DESC"],
        ["profitPercentage", "DESC"],
      ],
      limit: 6,
    }),

    // Active signals with subscriber count
    models.forexSignal.findAll({
      where: { status: true },
      limit: 4,
    }),

    // Recent completions
    models.forexInvestment.findAll({
      where: { status: { [Op.in]: COMPLETED_STATUS } },
      include: [
        { model: models.forexPlan, as: "plan", attributes: ["name", "title"] },
        { model: models.forexDuration, as: "duration" },
      ],
      order: [["updatedAt", "DESC"]],
      limit: 10,
    }),

    // All duration options
    models.forexDuration.findAll({
      order: [["timeframe", "ASC"], ["duration", "ASC"]],
    }),
  ]);

  // Get investment stats per plan
  const planInvestmentStats = await models.forexInvestment.findAll({
    attributes: [
      "planId",
      [fn("SUM", col("amount")), "totalInvested"],
      [fn("COUNT", fn("DISTINCT", col("userId"))), "investorCount"],
      [
        fn(
          "SUM",
          literal("CASE WHEN result = 'WIN' THEN 1 ELSE 0 END")
        ),
        "winCount",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN status IN ('${COMPLETED_STATUS.join("','")}') THEN 1 ELSE 0 END`
          )
        ),
        "completedCount",
      ],
    ],
    group: ["planId"],
    raw: true,
  });

  const planStatsMap = new Map(
    (planInvestmentStats as any[]).map((s) => [s.planId, s])
  );

  const totalInvested = totalInvestedResult || 0;
  const totalProfit = parseFloat((profitResult as any)?.totalProfit) || 0;
  const avgReturn = parseFloat((profitResult as any)?.avgReturn) || 0;
  const winRate =
    totalCompletedResult > 0
      ? Math.round((winCountResult / totalCompletedResult) * 100)
      : 0;

  // Format featured plans with stats
  const formattedPlans = featuredPlans.map((plan: any) => {
    const p = plan.toJSON();
    const stats = planStatsMap.get(p.id) || {};
    const planWinRate =
      parseInt(stats.completedCount) > 0
        ? Math.round(
            (parseInt(stats.winCount) / parseInt(stats.completedCount)) * 100
          )
        : 0;

    return {
      id: p.id,
      name: p.name,
      title: p.title,
      description: p.description,
      image: p.image,
      currency: p.currency,
      minProfit: p.minProfit,
      maxProfit: p.maxProfit,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      profitPercentage: p.profitPercentage,
      trending: p.trending,
      totalInvested: parseFloat(stats.totalInvested) || 0,
      investorCount: parseInt(stats.investorCount) || 0,
      winRate: planWinRate,
      durations: (p.durations || []).map((d: any) => ({
        duration: d.duration,
        timeframe: d.timeframe,
      })),
    };
  });

  // Top performing plan (by profit percentage)
  const topPlan =
    formattedPlans.length > 0
      ? formattedPlans.reduce((best: any, current: any) =>
          current.profitPercentage > best.profitPercentage ? current : best
        )
      : null;

  // Format signals
  const formattedSignals = await Promise.all(
    signals.map(async (s: any) => {
      const subscriberCount = await models.forexAccountSignal.count({
        where: { forexSignalId: s.id },
      });
      return {
        id: s.id,
        title: s.title,
        image: s.image,
        subscriberCount,
      };
    })
  );

  // Format recent completions
  const formattedCompletions = recentCompletions.map((inv: any) => {
    const i = inv.toJSON();
    const profitPercent = i.amount > 0 ? (i.profit / i.amount) * 100 : 0;
    return {
      planName: i.plan?.title || i.plan?.name || "Unknown",
      result: i.result,
      profit: i.profit || 0,
      profitPercent: Math.round(profitPercent * 10) / 10,
      duration: i.duration
        ? `${i.duration.duration} ${i.duration.timeframe.toLowerCase()}${i.duration.duration > 1 ? "s" : ""}`
        : "N/A",
      timeAgo: getTimeAgo(i.updatedAt),
      anonymizedUser: `Investor #${String(i.userId).slice(-4)}`,
    };
  });

  // Get monthly performance for chart (last 6 months)
  const monthlyData = await models.forexInvestment.findAll({
    where: {
      status: { [Op.in]: COMPLETED_STATUS },
      updatedAt: { [Op.gte]: sixMonthsAgo },
    },
    attributes: [
      [fn("DATE_FORMAT", col("updatedAt"), "%Y-%m"), "monthKey"],
      [fn("DATE_FORMAT", col("updatedAt"), "%b"), "month"],
      [fn("SUM", col("amount")), "totalInvested"],
      [fn("SUM", col("profit")), "totalProfit"],
      [fn("COUNT", col("id")), "completions"],
    ],
    group: [literal("monthKey")],
    order: [[literal("monthKey"), "ASC"]],
    raw: true,
  });

  const performanceHistory = (monthlyData as any[]).map((m) => ({
    month: m.month,
    totalInvested: parseFloat(m.totalInvested) || 0,
    totalProfit: parseFloat(m.totalProfit) || 0,
    avgReturn:
      parseFloat(m.totalInvested) > 0
        ? Math.round(
            (parseFloat(m.totalProfit) / parseFloat(m.totalInvested)) * 100 * 10
          ) / 10
        : 0,
    completions: parseInt(m.completions),
  }));

  // Duration options
  const timeframeOrder = { HOUR: 1, DAY: 2, WEEK: 3, MONTH: 4 };
  const sortedDurations = durations
    .map((d: any) => d.toJSON())
    .sort((a: any, b: any) => {
      const orderDiff =
        (timeframeOrder[a.timeframe as keyof typeof timeframeOrder] || 5) -
        (timeframeOrder[b.timeframe as keyof typeof timeframeOrder] || 5);
      return orderDiff !== 0 ? orderDiff : a.duration - b.duration;
    });

  const formatDuration = (d: any) =>
    `${d.duration} ${d.timeframe.toLowerCase()}${d.duration > 1 ? "s" : ""}`;

  const durationOptions = {
    shortest:
      sortedDurations.length > 0 ? formatDuration(sortedDurations[0]) : "1 hour",
    longest:
      sortedDurations.length > 0
        ? formatDuration(sortedDurations[sortedDurations.length - 1])
        : "12 months",
    mostPopular: "1 month",
  };

  return {
    stats: {
      activeInvestors,
      totalInvested,
      averageReturn: Math.round(avgReturn * 10) / 10,
      totalProfit,
      winRate,
      completedInvestments,
      activeInvestments,
      avgInvestmentAmount:
        activeInvestors > 0 ? Math.round(totalInvested / activeInvestors) : 0,
      topPlanRoi: topPlan?.profitPercentage || 0,
    },
    featuredPlans: formattedPlans,
    topPerformingPlan: topPlan ? { ...topPlan, badge: "top_performer" } : null,
    performanceHistory,
    signals: formattedSignals,
    recentCompletions: formattedCompletions,
    durationOptions,
  };
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
