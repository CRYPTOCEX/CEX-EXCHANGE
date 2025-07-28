import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Admin Stats",
  description: "Retrieves aggregated statistics for the ICO admin dashboard.",
  operationId: "getAdminStats",
  tags: ["ICO", "Admin", "Stats"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Admin stats retrieved successfully.",
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
              offeringGrowth: { type: "number" },
              raiseGrowth: { type: "number" },
              successRate: { type: "number" },
              successRateGrowth: { type: "number" },
              recentActivity: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string" },
                    offeringId: { type: "string" },
                    offeringName: { type: "string" },
                    admin: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        avatar: { type: "string" },
                      },
                    },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    500: { description: "Internal Server Error" },
  },
  permission: "access.ico.stat",
};

interface Handler {
  user?: { id: string; [key: string]: any };
}

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  // Define time periods for monthly comparisons.
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Run aggregated queries concurrently.
  const [
    offeringsStats,
    totalRaisedRow,
    offeringsGrowthStats,
    raiseGrowthStats,
    successRateStats,
    recentActivities,
  ] = await Promise.all([
    // 1. Overall offering counts.
    models.icoTokenOffering.findOne({
      attributes: [
        [fn("COUNT", literal("*")), "totalOfferings"],
        [
          fn("SUM", literal("CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END")),
          "pendingOfferings",
        ],
        [
          fn("SUM", literal("CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END")),
          "activeOfferings",
        ],
        [
          fn("SUM", literal("CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END")),
          "completedOfferings",
        ],
        [
          fn("SUM", literal("CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END")),
          "rejectedOfferings",
        ],
      ],
      raw: true,
    }),
    // 2. Total raised funds (all non-rejected transactions).
    models.icoTransaction.findOne({
      attributes: [[fn("SUM", literal("price * amount")), "totalReleased"]],
      where: { status: { [Op.not]: ["REJECTED"] } },
      raw: true,
    }),
    // 3. Offerings growth: count of offerings in current and previous month.
    models.icoTokenOffering.findOne({
      attributes: [
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`
            )
          ),
          "currentOfferings",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`
            )
          ),
          "previousOfferings",
        ],
      ],
      raw: true,
    }),
    // 4. Raise growth: sum of investments in current and previous month.
    models.icoTransaction.findOne({
      attributes: [
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`
            )
          ),
          "currentInvested",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`
            )
          ),
          "previousInvested",
        ],
      ],
      raw: true,
    }),
    // 5. Success rate growth: monthly counts of total and active offerings.
    models.icoTokenOffering.findOne({
      attributes: [
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN 1 ELSE 0 END`
            )
          ),
          "currentTotal",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status = 'ACTIVE' THEN 1 ELSE 0 END`
            )
          ),
          "currentActive",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN 1 ELSE 0 END`
            )
          ),
          "previousTotal",
        ],
        [
          fn(
            "SUM",
            literal(
              `CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status = 'ACTIVE' THEN 1 ELSE 0 END`
            )
          ),
          "previousActive",
        ],
      ],
      raw: true,
    }),
    // 6. Recent admin activities (latest 5).
    models.icoAdminActivity.findAll({
      include: [
        {
          model: models.user,
          as: "admin",
          attributes: ["firstName", "lastName", "avatar"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5,
      raw: true,
    }),
  ]);

  // Parse overall offering counts.
  const totalOfferings = parseInt(offeringsStats.totalOfferings, 10) || 0;
  const pendingOfferings = parseInt(offeringsStats.pendingOfferings, 10) || 0;
  const activeOfferings = parseInt(offeringsStats.activeOfferings, 10) || 0;
  const completedOfferings =
    parseInt(offeringsStats.completedOfferings, 10) || 0;
  const rejectedOfferings = parseInt(offeringsStats.rejectedOfferings, 10) || 0;

  // Parse total raised.
  const totalRaised = parseFloat(totalRaisedRow.totalReleased) || 0;

  // Compute offerings growth percentage.
  const currentOfferings =
    parseInt(offeringsGrowthStats.currentOfferings, 10) || 0;
  const previousOfferings =
    parseInt(offeringsGrowthStats.previousOfferings, 10) || 0;
  const offeringGrowth =
    previousOfferings > 0
      ? Math.round(
          ((currentOfferings - previousOfferings) / previousOfferings) * 100
        )
      : 0;

  // Compute raise growth percentage.
  const currentInvested = parseFloat(raiseGrowthStats.currentInvested) || 0;
  const previousInvested = parseFloat(raiseGrowthStats.previousInvested) || 0;
  const raiseGrowth =
    previousInvested > 0
      ? Math.round(
          ((currentInvested - previousInvested) / previousInvested) * 100
        )
      : 0;

  // Overall success rate is computed from overall counts.
  const successRate =
    totalOfferings > 0
      ? Math.round((activeOfferings / totalOfferings) * 100)
      : 0;

  // Compute monthly success rates and their growth.
  const currentTotal = parseInt(successRateStats.currentTotal, 10) || 0;
  const currentActive = parseInt(successRateStats.currentActive, 10) || 0;
  const previousTotal = parseInt(successRateStats.previousTotal, 10) || 0;
  const previousActive = parseInt(successRateStats.previousActive, 10) || 0;
  const currentSuccessRate =
    currentTotal > 0 ? Math.round((currentActive / currentTotal) * 100) : 0;
  const previousSuccessRate =
    previousTotal > 0 ? Math.round((previousActive / previousTotal) * 100) : 0;
  const successRateGrowth = previousSuccessRate
    ? currentSuccessRate - previousSuccessRate
    : 0;

  // Map recent admin activities.
  const recentActivity = recentActivities.map((activity: any) => ({
    id: activity.id,
    type: activity.type,
    offeringId: activity.offeringId,
    offeringName: activity.offeringName,
    adminId: activity.adminId,
    admin: {
      name: `${activity["admin.firstName"]} ${activity["admin.lastName"]}`,
      avatar: activity["admin.avatar"],
    },
    timestamp: activity.createdAt,
  }));

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
    recentActivity,
  };
};
