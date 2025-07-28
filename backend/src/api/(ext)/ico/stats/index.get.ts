import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal } from "sequelize";

export const metadata = {
  summary: "Get ICO Platform Statistics",
  description:
    "Retrieves ICO platform statistics including total raised funds, growth percentage, successful offerings count, total investors, and average ROI. Calculations are now based on all non-rejected transactions and monthly comparisons.",
  operationId: "getIcoStats",
  tags: ["ICO", "Stats"],
  requiresAuth: true,
  responses: {
    200: {
      description: "ICO platform statistics retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalRaised: { type: "number" },
              raisedGrowth: { type: "number" },
              successfulOfferings: { type: "number" },
              offeringsGrowth: { type: "number" },
              totalInvestors: { type: "number" },
              investorsGrowth: { type: "number" },
              averageROI: { type: "number" },
              roiGrowth: { type: "number" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
};

interface Handler {
  user?: { id: string; [key: string]: any };
}

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (!models.icoTransaction || !models.icoTokenOffering) {
    throw createError({
      statusCode: 500,
      message:
        `Model(s) missing: ` +
        (!models.icoTransaction ? "icoTransaction " : "") +
        (!models.icoTokenOffering ? "icoTokenOffering " : ""),
    });
  }

  const investmentModel = models.icoInvestment || models.icoTransaction;
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [transactionStats, offeringsStats, investorStats] = await Promise.all([
    // 1) Transaction Stats
    models.icoTransaction.findOne({
      attributes: [
        [
          fn(
            "SUM",
            literal(
              "CASE WHEN status NOT IN ('REJECTED') THEN price * amount ELSE 0 END"
            )
          ),
          "totalRaised",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`
            )
          ),
          "currentRaised",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`
            )
          ),
          "previousRaised",
        ],
      ],
      raw: true,
    }),

    // 2) Offerings Stats
    models.icoTokenOffering.findOne({
      attributes: [
        [
          fn("SUM", literal("CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END")),
          "successfulOfferings",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status = 'SUCCESS' THEN 1 ELSE 0 END`
            )
          ),
          "currentSuccessfulOfferings",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status = 'SUCCESS' THEN 1 ELSE 0 END`
            )
          ),
          "previousSuccessfulOfferings",
        ],
      ],
      raw: true,
    }),

    // 3) Investor Stats
    investmentModel.findOne({
      attributes: [
        [fn("COUNT", literal("DISTINCT userId")), "totalInvestors"],
        [
          fn(
            "COUNT",
            literal(
              `DISTINCT CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN userId ELSE NULL END`
            )
          ),
          "currentInvestors",
        ],
        [
          fn(
            "COUNT",
            literal(
              `DISTINCT CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN userId ELSE NULL END`
            )
          ),
          "previousInvestors",
        ],
      ],
      raw: true,
    }),
  ]);

  // Parse Transaction Stats
  const totalRaised = parseFloat(transactionStats?.totalRaised) || 0;
  const currentRaised = parseFloat(transactionStats?.currentRaised) || 0;
  const previousRaised = parseFloat(transactionStats?.previousRaised) || 0;
  const raisedGrowth =
    previousRaised > 0
      ? Math.round(((currentRaised - previousRaised) / previousRaised) * 100)
      : 0;

  // Parse Offerings Stats
  const successfulOfferings =
    parseInt(offeringsStats?.successfulOfferings, 10) || 0;
  const currentSuccessfulOfferings =
    parseInt(offeringsStats?.currentSuccessfulOfferings, 10) || 0;
  const previousSuccessfulOfferings =
    parseInt(offeringsStats?.previousSuccessfulOfferings, 10) || 0;
  const offeringsGrowth =
    previousSuccessfulOfferings > 0
      ? Math.round(
          ((currentSuccessfulOfferings - previousSuccessfulOfferings) /
            previousSuccessfulOfferings) *
            100
        )
      : 0;

  // Parse Investor Stats
  const totalInvestors = parseInt(investorStats?.totalInvestors, 10) || 0;
  const currentInvestors = parseInt(investorStats?.currentInvestors, 10) || 0;
  const previousInvestors = parseInt(investorStats?.previousInvestors, 10) || 0;
  const investorsGrowth =
    previousInvestors > 0
      ? Math.round(
          ((currentInvestors - previousInvestors) / previousInvestors) * 100
        )
      : 0;

  // ROI stats not available in schema, so return zero
  const averageROI = 0;
  const roiGrowth = 0;

  return {
    totalRaised,
    raisedGrowth,
    successfulOfferings,
    offeringsGrowth,
    totalInvestors,
    investorsGrowth,
    averageROI,
    roiGrowth,
  };
};
