import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Creator Stats",
  description:
    "Retrieves aggregated statistics (counts, growth metrics) for the authenticated creator's ICO offerings, " +
    "and calculates total raised and raise growth from all transactions except those with a 'REJECTED' status.",
  operationId: "getCreatorStatsStats",
  tags: ["ICO", "Creator", "Stats"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Creator statistics retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalOfferings: { type: "number" },
              pendingOfferings: { type: "number" },
              activeOfferings: { type: "number" },
              completedOfferings: { type: "number" },
              rejectedOfferings: { type: "number" },
              totalRaised: { type: "number" },
              currentRaised: { type: "number" },
              previousRaised: { type: "number" },
              offeringsGrowth: { type: "number" },
              activeGrowth: { type: "number" },
              raiseGrowth: { type: "number" }
            }
          }
        }
      }
    },
    401: {
      description: "Unauthorized"
    },
    500: {
      description: "Internal server error"
    }
  }
};

interface Handler {
  user?: { id: string; [key: string]: any };
}

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const userId = user.id;
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Aggregated query for overall offering counts
  const offeringStatsPromise = models.icoTokenOffering.findOne({
    attributes: [
      [fn("COUNT", literal("*")), "totalOfferings"],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`status\` = 'PENDING' THEN 1 ELSE 0 END`
          )
        ),
        "pendingOfferings",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`status\` = 'ACTIVE' THEN 1 ELSE 0 END`
          )
        ),
        "activeOfferings",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`status\` = 'SUCCESS' THEN 1 ELSE 0 END`
          )
        ),
        "completedOfferings",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`status\` = 'REJECTED' THEN 1 ELSE 0 END`
          )
        ),
        "rejectedOfferings",
      ],
    ],
    where: { userId },
    raw: true,
  });

  // Aggregated query for monthly offering stats (current and previous month)
  const monthStatsPromise = models.icoTokenOffering.findOne({
    attributes: [
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`createdAt\` >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "currentOfferingsCount",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`createdAt\` >= '${currentMonthStart.toISOString()}' AND \`icoTokenOffering\`.\`status\` = 'ACTIVE' THEN 1 ELSE 0 END`
          )
        ),
        "currentActive",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`createdAt\` >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "currentTotal",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`createdAt\` BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "previousOfferingsCount",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`createdAt\` BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND \`icoTokenOffering\`.\`status\` = 'ACTIVE' THEN 1 ELSE 0 END`
          )
        ),
        "previousActive",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTokenOffering\`.\`createdAt\` BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`
          )
        ),
        "previousTotal",
      ],
    ],
    where: { userId },
    raw: true,
  });

  // Aggregated query for transactions (total, current month, and previous month)
  const transactionStatsPromise = models.icoTransaction.findOne({
    attributes: [
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTransaction\`.\`status\` NOT IN ('REJECTED') THEN \`icoTransaction\`.\`price\` * \`icoTransaction\`.\`amount\` ELSE 0 END`
          )
        ),
        "totalRaised",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTransaction\`.\`createdAt\` >= '${currentMonthStart.toISOString()}' AND \`icoTransaction\`.\`status\` NOT IN ('REJECTED') THEN \`icoTransaction\`.\`price\` * \`icoTransaction\`.\`amount\` ELSE 0 END`
          )
        ),
        "currentRaised",
      ],
      [
        fn(
          "SUM",
          literal(
            `CASE WHEN \`icoTransaction\`.\`createdAt\` BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND \`icoTransaction\`.\`status\` NOT IN ('REJECTED') THEN \`icoTransaction\`.\`price\` * \`icoTransaction\`.\`amount\` ELSE 0 END`
          )
        ),
        "previousRaised",
      ],
    ],
    include: [
      {
        model: models.icoTokenOffering,
        as: "offering",
        attributes: [],
        where: { userId },
      },
    ],
    raw: true,
  });

  // Execute aggregated queries concurrently
  const [offeringStats, monthStats, transactionStats] = await Promise.all([
    offeringStatsPromise,
    monthStatsPromise,
    transactionStatsPromise,
  ]);

  // Parse aggregated values
  const totalOfferings = parseInt(offeringStats.totalOfferings, 10) || 0;
  const pendingOfferings = parseInt(offeringStats.pendingOfferings, 10) || 0;
  const activeOfferings = parseInt(offeringStats.activeOfferings, 10) || 0;
  const completedOfferings =
    parseInt(offeringStats.completedOfferings, 10) || 0;
  const rejectedOfferings = parseInt(offeringStats.rejectedOfferings, 10) || 0;

  const currentOfferingsCount =
    parseInt(monthStats.currentOfferingsCount, 10) || 0;
  const previousOfferingsCount =
    parseInt(monthStats.previousOfferingsCount, 10) || 0;
  const currentActive = parseInt(monthStats.currentActive, 10) || 0;
  const previousActive = parseInt(monthStats.previousActive, 10) || 0;
  const currentTotal = parseInt(monthStats.currentTotal, 10) || 0;
  const previousTotal = parseInt(monthStats.previousTotal, 10) || 0;

  const totalRaised = parseFloat(transactionStats.totalRaised) || 0;
  const currentRaised = parseFloat(transactionStats.currentRaised) || 0;
  const previousRaised = parseFloat(transactionStats.previousRaised) || 0;

  // Calculate growth metrics
  const offeringGrowth =
    previousOfferingsCount > 0
      ? Math.round(
          ((currentOfferingsCount - previousOfferingsCount) /
            previousOfferingsCount) *
            100
        )
      : 0;
  const raiseGrowth =
    previousRaised > 0
      ? Math.round(((currentRaised - previousRaised) / previousRaised) * 100)
      : 0;
  const currentSuccessRate =
    currentTotal > 0 ? Math.round((currentActive / currentTotal) * 100) : 0;
  const previousSuccessRate =
    previousTotal > 0 ? Math.round((previousActive / previousTotal) * 100) : 0;
  const successRate =
    totalOfferings > 0
      ? Math.round((activeOfferings / totalOfferings) * 100)
      : 0;
  const successRateGrowth = previousSuccessRate
    ? currentSuccessRate - previousSuccessRate
    : 0;

  return {
    totalOfferings,
    pendingOfferings,
    activeOfferings,
    completedOfferings,
    rejectedOfferings,
    totalRaised,
    offeringGrowth,
    raiseGrowth,
    successRate,
    successRateGrowth,
  };
};
