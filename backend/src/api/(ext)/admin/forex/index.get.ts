import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Forex Dashboard Statistics",
  description:
    "Retrieves statistics for the Forex admin dashboard including total investments, active users, active plans, total accounts, investment growth chart data (with timeframe options: 1m, 3m, 1y), plan distribution, and recent investments.",
  operationId: "getForexDashboardStats",
  tags: ["Forex", "Dashboard"],
  requiresAuth: true,
  parameters: [
    {
      name: "timeframe",
      in: "query",
      description: "Range of data to retrieve",
      required: false,
      schema: { type: "string", enum: ["1m", "3m", "1y"] },
    },
  ],
  responses: {
    200: {
      description: "Forex dashboard statistics retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              overview: {
                type: "object",
                properties: {
                  totalInvestments: { type: "number" },
                  investmentsGrowth: { type: "number" },
                  activeUsers: { type: "number" },
                  usersGrowth: { type: "number" },
                  activePlans: { type: "number" },
                  plansGrowth: { type: "number" },
                  totalAccounts: { type: "number" },
                  accountsGrowth: { type: "number" },
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
                  },
                },
              },
              recentInvestments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    user: { type: "string" },
                    plan: { type: "string" },
                    amount: { type: "number" },
                    date: { type: "string", format: "date-time" },
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
  permission: "access.forex",
};

// Helper function to compute ISO week number.
function getWeekNumber(d: Date) {
  // Clone date so don't modify original
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
  const { timeframe = "1y" } = query;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const now = new Date();

  // Determine chart data parameters based on timeframe value.
  let startDate: Date, endDate: Date, groupFormat: string, intervals: string[];

  if (timeframe === "1m") {
    // 1 month: group by day for current month.
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month
    groupFormat = "%d"; // day of month (01,02,...)
    const daysInMonth = endDate.getDate();
    intervals = Array.from({ length: daysInMonth }, (_, i) =>
      (i + 1).toString()
    );
  } else if (timeframe === "3m") {
    // 3 months: from 2 months before current month to end of current month, grouped weekly.
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    groupFormat = "%Y-%u"; // year-week number (e.g., "2023-42")
    const intervalsArr: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      intervalsArr.push(`${current.getFullYear()}-${getWeekNumber(current)}`);
      current.setDate(current.getDate() + 7);
    }
    intervals = intervalsArr;
  } else {
    // 1 year (default): from start to end of current year, grouped by month.
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31);
    groupFormat = "%b"; // abbreviated month (Jan, Feb, etc.)
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

  // === OVERVIEW STATS ===
  const [investmentStats, accountStats, planStats, userStats] =
    await Promise.all([
      models.forexInvestment.findOne({
        attributes: [
          [
            fn(
              "COALESCE",
              fn(
                "SUM",
                literal("CASE WHEN status != 'REJECTED' THEN amount ELSE 0 END")
              ),
              0
            ),
            "totalInvestments",
          ],
          [
            fn(
              "COALESCE",
              fn(
                "SUM",
                literal(
                  `CASE WHEN createdAt >= '${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}' AND status != 'REJECTED' THEN amount ELSE 0 END`
                )
              ),
              0
            ),
            "currentInvestments",
          ],
          [
            fn(
              "COALESCE",
              fn(
                "SUM",
                literal(
                  `CASE WHEN createdAt BETWEEN '${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()}' AND '${new Date(now.getFullYear(), now.getMonth(), 0).toISOString()}' AND status != 'REJECTED' THEN amount ELSE 0 END`
                )
              ),
              0
            ),
            "previousInvestments",
          ],
        ],
        raw: true,
      }),
      models.forexAccount.findOne({
        attributes: [
          [fn("COUNT", literal("id")), "totalAccounts"],
          [
            fn(
              "COUNT",
              literal(
                `CASE WHEN createdAt >= '${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}' THEN id ELSE NULL END`
              )
            ),
            "currentAccounts",
          ],
          [
            fn(
              "COUNT",
              literal(
                `CASE WHEN createdAt BETWEEN '${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()}' AND '${new Date(now.getFullYear(), now.getMonth(), 0).toISOString()}' THEN id ELSE NULL END`
              )
            ),
            "previousAccounts",
          ],
        ],
        raw: true,
      }),
      models.forexPlan.findOne({
        attributes: [
          [fn("COUNT", literal("id")), "activePlans"],
          [
            fn(
              "COUNT",
              literal(
                `CASE WHEN createdAt >= '${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}' AND status = true THEN id ELSE NULL END`
              )
            ),
            "currentActivePlans",
          ],
          [
            fn(
              "COUNT",
              literal(
                `CASE WHEN createdAt BETWEEN '${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()}' AND '${new Date(now.getFullYear(), now.getMonth(), 0).toISOString()}' AND status = true THEN id ELSE NULL END`
              )
            ),
            "previousActivePlans",
          ],
        ],
        raw: true,
      }),
      models.forexAccount.findOne({
        attributes: [
          [fn("COUNT", fn("DISTINCT", literal("userId"))), "activeUsers"],
          [
            fn(
              "COUNT",
              literal(
                `DISTINCT CASE WHEN createdAt >= '${new Date(now.getFullYear(), now.getMonth(), 1).toISOString()}' THEN userId ELSE NULL END`
              )
            ),
            "currentActiveUsers",
          ],
          [
            fn(
              "COUNT",
              literal(
                `DISTINCT CASE WHEN createdAt BETWEEN '${new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()}' AND '${new Date(now.getFullYear(), now.getMonth(), 0).toISOString()}' THEN userId ELSE NULL END`
              )
            ),
            "previousActiveUsers",
          ],
        ],
        raw: true,
      }),
    ]);

  const totalInvestments = parseFloat(investmentStats.totalInvestments) || 0;
  const currentInvestments =
    parseFloat(investmentStats.currentInvestments) || 0;
  const previousInvestments =
    parseFloat(investmentStats.previousInvestments) || 0;
  const investmentsGrowth =
    previousInvestments > 0
      ? Math.round(
          ((currentInvestments - previousInvestments) / previousInvestments) *
            100
        )
      : 0;

  const totalAccounts = parseInt(accountStats.totalAccounts, 10) || 0;
  const currentAccounts = parseInt(accountStats.currentAccounts, 10) || 0;
  const previousAccounts = parseInt(accountStats.previousAccounts, 10) || 0;
  const accountsGrowth =
    previousAccounts > 0
      ? Math.round(
          ((currentAccounts - previousAccounts) / previousAccounts) * 100
        )
      : 0;

  const activePlans = parseInt(planStats.activePlans, 10) || 0;
  const currentActivePlans = parseInt(planStats.currentActivePlans, 10) || 0;
  const previousActivePlans = parseInt(planStats.previousActivePlans, 10) || 0;
  const plansGrowth =
    previousActivePlans > 0
      ? Math.round(
          ((currentActivePlans - previousActivePlans) / previousActivePlans) *
            100
        )
      : 0;

  const activeUsers = parseInt(userStats.activeUsers, 10) || 0;
  const currentActiveUsers = parseInt(userStats.currentActiveUsers, 10) || 0;
  const previousActiveUsers = parseInt(userStats.previousActiveUsers, 10) || 0;
  const usersGrowth =
    previousActiveUsers > 0
      ? Math.round(
          ((currentActiveUsers - previousActiveUsers) / previousActiveUsers) *
            100
        )
      : 0;

  const overview = {
    totalInvestments,
    investmentsGrowth,
    activeUsers,
    usersGrowth,
    activePlans,
    plansGrowth,
    totalAccounts,
    accountsGrowth,
  };

  // === CHART DATA ===
  const chartDataRaw = await models.forexInvestment.findAll({
    attributes: [
      [fn("DATE_FORMAT", sequelize.col("createdAt"), groupFormat), "period"],
      [fn("SUM", sequelize.col("amount")), "totalInvested"],
    ],
    where: {
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

  // === PLAN DISTRIBUTION ===
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
        where: { status: { [Op.ne]: "REJECTED" } },
        required: false,
      },
    ],
    group: ["forexPlan.id"],
    raw: true,
  });

  const planDistribution = planDistributionRaw.map((plan: any) => ({
    name: plan.name,
    value: parseFloat(plan.totalInvested) || 0,
  }));

  // === RECENT INVESTMENTS ===
  const recentInvestmentsRaw = await models.forexInvestment.findAll({
    where: {},
    include: [
      { model: models.user, as: "user", attributes: ["firstName", "lastName"] },
      { model: models.forexPlan, as: "plan", attributes: ["name"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: 5,
    raw: true,
    nest: true,
  });

  const recentInvestments = recentInvestmentsRaw.map((inv: any) => ({
    id: inv.id,
    user: inv.user ? `${inv.user.firstName} ${inv.user.lastName}` : "Unknown",
    plan: inv.plan?.name || "Unknown",
    amount: inv.amount,
    date: inv.createdAt,
    status: inv.status,
  }));

  return {
    overview,
    chartData,
    planDistribution,
    recentInvestments,
  };
};
