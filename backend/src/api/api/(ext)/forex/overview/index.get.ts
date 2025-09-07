import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Forex User Dashboard Data",
  description:
    "Retrieves user-specific dashboard data including overview statistics, chart data, plan distribution, and recent investments.",
  operationId: "getForexUserDashboardData",
  tags: ["Forex", "Dashboard", "User"],
  requiresAuth: true,
  parameters: [
    {
      name: "timeframe",
      in: "query",
      description: "Timeframe for chart data: 1m, 3m, or 1y",
      required: false,
      schema: { type: "string", enum: ["1m", "3m", "1y"] },
    },
  ],
  responses: {
    200: {
      description: "User dashboard data retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              overview: {
                type: "object",
                properties: {
                  totalInvested: { type: "number" },
                  totalProfit: { type: "number" },
                  profitPercentage: { type: "number" },
                  activeInvestments: { type: "number" },
                  completedInvestments: { type: "number" },
                },
              },
              chartData: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
              planDistribution: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    value: { type: "number" },
                    percentage: { type: "number" },
                  },
                },
              },
              recentInvestments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    plan: { type: "string" },
                    amount: { type: "number" },
                    createdAt: { type: "string", format: "date-time" },
                    status: { type: "string" },
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
};

// Helper to compute week numbers (for grouping weekly)
function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

interface Handler {
  user?: { id: string; [key: string]: any };
  query: { timeframe?: string };
}

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const userId = user.id;
  const { timeframe = "1y" } = query;
  const now = new Date();

  let startDate: Date, endDate: Date, groupFormat: string, intervals: string[];

  if (timeframe === "1m") {
    // Group by day for current month.
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    groupFormat = "%d"; // day (01, 02, …)
    const daysInMonth = endDate.getDate();
    intervals = Array.from({ length: daysInMonth }, (_, i) =>
      (i + 1).toString()
    );
  } else if (timeframe === "3m") {
    // Group by week (year-week format)
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    groupFormat = "%Y-%u";
    const intervalsArr: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      intervalsArr.push(`${current.getFullYear()}-${getWeekNumber(current)}`);
      current.setDate(current.getDate() + 7);
    }
    intervals = intervalsArr;
  } else {
    // Default 1y: group by abbreviated month
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31);
    groupFormat = "%b";
    intervals = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
  }

  // --- OVERVIEW DATA ---
  const investments = await models.forexInvestment.findAll({
    where: {
      userId,
      status: { [Op.ne]: "REJECTED" },
    },
    raw: true,
  });

  const totalInvested = investments.reduce(
    (sum, inv) => sum + (parseFloat(inv.amount) || 0),
    0
  );
  const totalProfit = investments.reduce(
    (sum, inv) => sum + (parseFloat(inv.profit) || 0),
    0
  );
  const profitPercentage =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const activeInvestments = investments.filter(
    (inv) => inv.status === "ACTIVE"
  ).length;
  const completedInvestments = investments.filter(
    (inv) => inv.status === "COMPLETED"
  ).length;

  const overview = {
    totalInvested,
    totalProfit,
    profitPercentage,
    activeInvestments,
    completedInvestments,
  };

  // --- CHART DATA ---
  const chartDataRaw = await models.forexInvestment.findAll({
    attributes: [
      [fn("DATE_FORMAT", sequelize.col("createdAt"), groupFormat), "period"],
      [fn("SUM", sequelize.col("amount")), "totalInvested"],
    ],
    where: {
      userId,
      status: { [Op.ne]: "REJECTED" },
      createdAt: { [Op.between]: [startDate, endDate] },
    },
    group: ["period"],
    raw: true,
  });

  const chartDataMap: { [key: string]: number } = {};
  chartDataRaw.forEach((item: any) => {
    chartDataMap[item.period] = parseFloat(item.totalInvested) || 0;
  });
  const chartData = intervals.map((interval) => ({
    name: interval,
    value: chartDataMap[interval] || 0,
  }));

  // --- PLAN DISTRIBUTION ---
  const planDistributionRaw = await models.forexPlan.findAll({
    attributes: [
      "name",
      [
        fn("COALESCE", fn("SUM", sequelize.col("investments.amount")), 0),
        "totalInvested",
      ],
    ],
    include: [
      {
        model: models.forexInvestment,
        as: "investments",
        attributes: [],
        where: { userId, status: { [Op.ne]: "REJECTED" } },
        required: false,
      },
    ],
    group: ["forexPlan.id"],
    raw: true,
  });
  const planDistribution = planDistributionRaw.map((plan: any) => {
    const invested = parseFloat(plan.totalInvested) || 0;
    const percentage = totalInvested > 0 ? (invested / totalInvested) * 100 : 0;
    return {
      name: plan.name,
      value: invested,
      percentage,
    };
  });

  // --- RECENT INVESTMENTS ---
  const recentInvestmentsRaw = await models.forexInvestment.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit: 5,
    raw: true,
  });
  const recentInvestments = recentInvestmentsRaw.map((inv: any) => ({
    id: inv.id,
    plan: inv.planId, // Alternatively, you could join the plan table to get the name.
    amount: inv.amount,
    createdAt: inv.createdAt,
    status: inv.status,
  }));

  return {
    overview,
    chartData,
    planDistribution,
    recentInvestments,
  };
};
