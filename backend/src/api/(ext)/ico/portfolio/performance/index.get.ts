import { getAllocationByToken, getUserPortfolioHistory } from "./utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get Portfolio Performance Data",
  description:
    "Generates historical performance data and calculates metrics for the user's ICO portfolio based on real transactions and token offering data. The timeframe (e.g. '1W', '1M', '3M', '1Y', 'ALL') specifies the period to compute over. Additionally, a metric for rejected investments is provided.",
  operationId: "getPortfolioPerformanceData",
  tags: ["ICO", "Portfolio", "Performance"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "timeframe",
      in: "query",
      required: false,
      schema: {
        type: "string",
        description:
          "Timeframe for performance data (e.g. '1W', '1M', '3M', '1Y', 'ALL').",
      },
    },
  ],
  responses: {
    200: {
      description: "Portfolio performance data retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              performanceData: {
                type: "array",
                description: "Array of daily performance data points.",
              },
              metrics: {
                type: "object",
                description: "Calculated portfolio performance metrics.",
                properties: {
                  initialValue: { type: "number" },
                  currentValue: { type: "number" },
                  absoluteChange: { type: "number" },
                  percentageChange: { type: "number" },
                  bestDay: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      change: { type: "number" },
                    },
                  },
                  worstDay: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      change: { type: "number" },
                    },
                  },
                  volatility: { type: "number" },
                  sharpeRatio: { type: "number" },
                  rejectedInvested: { type: "number" },
                  allocation: {
                    type: "object",
                    properties: {
                      byToken: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            percentage: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) throw new Error("Unauthorized");

  // Determine timeframe in days.
  const timeframe = query.timeframe || "1M";
  let days: number;
  switch (timeframe) {
    case "1W":
      days = 7;
      break;
    case "1M":
      days = 30;
      break;
    case "3M":
      days = 90;
      break;
    case "1Y":
      days = 365;
      break;
    case "ALL":
      days = 730;
      break;
    default:
      days = 30;
  }
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - days);

  // Retrieve the historical portfolio performance.
  // Note: getUserPortfolioHistory replays only "RELEASED" (i.e. completed) transactions.
  const performanceData = await getUserPortfolioHistory(
    user.id,
    startDate,
    endDate
  );
  if (!performanceData || performanceData.length === 0) {
    throw new Error("No performance data available");
  }

  // Compute basic portfolio values.
  const initialValue = performanceData[0].value;
  const finalValue = performanceData[performanceData.length - 1].value;
  const absoluteChange = finalValue - initialValue;
  const percentageChange =
    initialValue > 0 ? (absoluteChange / initialValue) * 100 : 0;

  // Calculate daily returns and track best/worst days.
  let bestDayReturn = Number.NEGATIVE_INFINITY;
  let bestDayDate = "";
  let worstDayReturn = Number.POSITIVE_INFINITY;
  let worstDayDate = "";
  const dailyReturns: number[] = [];
  for (let i = 1; i < performanceData.length; i++) {
    const prev = performanceData[i - 1].value;
    const curr = performanceData[i].value;
    const ret = prev > 0 ? (curr - prev) / prev : 0;
    dailyReturns.push(ret);
    if (ret > bestDayReturn) {
      bestDayReturn = ret;
      bestDayDate = performanceData[i].date;
    }
    if (ret < worstDayReturn) {
      worstDayReturn = ret;
      worstDayDate = performanceData[i].date;
    }
  }

  // Compute annualized volatility and Sharpe ratio.
  let annualizedVolatility = 0;
  let sharpeRatio = 0;
  if (dailyReturns.length > 0) {
    const meanReturn =
      dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
      dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    annualizedVolatility = stdDev * Math.sqrt(252) * 100; // expressed in percentage
    const annualizedReturn =
      initialValue > 0
        ? Math.pow(finalValue / initialValue, 365 / days) - 1
        : 0;
    const riskFreeRate = 0.02;
    sharpeRatio =
      annualizedVolatility !== 0
        ? (annualizedReturn - riskFreeRate) / (annualizedVolatility / 100)
        : 0;
  }

  // Calculate allocation by token from the final holdings.
  // The getAllocationByToken function aggregates all "RELEASED" transactions up to endDate.
  const { allocationByToken } = await getAllocationByToken(user.id, endDate);

  // --- New: Calculate rejected invested funds ---
  const rejectedTransactions = await models.icoTransaction.findAll({
    where: {
      userId: user.id,
      createdAt: { [Op.lte]: endDate },
      status: "REJECTED",
    },
    raw: true,
  });
  const rejectedInvested = rejectedTransactions.reduce((sum, tx) => {
    return sum + tx.amount * tx.price;
  }, 0);

  const metrics = {
    initialValue,
    currentValue: finalValue,
    absoluteChange,
    percentageChange,
    bestDay: { date: bestDayDate, change: bestDayReturn * 100 },
    worstDay: { date: worstDayDate, change: worstDayReturn * 100 },
    volatility: annualizedVolatility,
    sharpeRatio,
    allocation: {
      byToken: allocationByToken,
    },
    rejectedInvested, // New metric for rejected investments.
  };

  return { performanceData, metrics };
};
