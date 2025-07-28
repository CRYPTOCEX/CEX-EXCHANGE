import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, literal, Op } from "sequelize";

// You can adjust status names as per your schema
const ACTIVE_INVESTMENT_STATUS = ["ACTIVE", "RUNNING", "OPEN"];
const COMPLETED_INVESTMENT_STATUS = ["COMPLETED", "CLOSED"];

export const metadata = {
  summary: "Get Investment Platform Statistics",
  description:
    "Retrieves platform-wide investment stats: number of active investors, total invested amount, average return (completed investments), and number of investment plans.",
  operationId: "getInvestmentStats",
  tags: ["Investment", "Stats"],
  responses: {
    200: {
      description: "Investment platform statistics retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              activeInvestors: {
                type: "number",
                description: "Unique users with active investments.",
              },
              totalInvested: {
                type: "number",
                description: "Total amount invested (all time).",
              },
              averageReturn: {
                type: "number",
                description:
                  "Average return percentage for completed investments.",
              },
              totalPlans: {
                type: "number",
                description: "Total number of active investment plans.",
              },
              maxProfitPercentage: {
                type: "number",
                description: "Maximum profit percentage among all active plans.",
              },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error." },
  },
};

export default async function getInvestmentStats() {
  try {
    // 1. Active Investors (unique user IDs with active investments)
    const activeInvestors = await models.investment.count({
      distinct: true,
      col: "userId",
      where: { status: { [Op.in]: ACTIVE_INVESTMENT_STATUS } },
    });

    // 2. Total Invested (all investments, regardless of status)
    const totalInvestedRow = await models.investment.findOne({
      attributes: [[fn("SUM", col("amount")), "totalInvested"]],
      raw: true,
    });
    const totalInvested = Number(totalInvestedRow?.totalInvested || 0);

    // 3. Average Return (only from completed/closed investments)
    const avgReturnRow = await models.investment.findOne({
      attributes: [
        [
          fn(
            "AVG",
            literal(
              "CASE WHEN amount > 0 AND profit IS NOT NULL THEN ((profit / amount) * 100) ELSE NULL END"
            )
          ),
          "averageReturn",
        ],
      ],
      where: { status: { [Op.in]: COMPLETED_INVESTMENT_STATUS } },
      raw: true,
    });
    const averageReturn = Number(avgReturnRow?.averageReturn || 0);

    // 4. Total Plans (active investment plans)
    const totalPlans = await models.investmentPlan.count({
      where: { status: true },
    });

    // 5. Maximum Profit Percentage (highest among active plans)
    const maxProfitRow = await models.investmentPlan.findOne({
      attributes: [[fn("MAX", col("profitPercentage")), "maxProfitPercentage"]],
      where: { status: true },
      raw: true,
    });
    const maxProfitPercentage = Number(maxProfitRow?.maxProfitPercentage || 0);

    return {
      activeInvestors,
      totalInvested,
      averageReturn,
      totalPlans,
      maxProfitPercentage,
    };
  } catch (err) {
    console.error("Error in getInvestmentStats:", err);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
} 