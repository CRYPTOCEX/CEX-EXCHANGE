import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, Op } from "sequelize";

export const metadata = {
  summary: "Get Aggregated Earnings",
  description:
    "Retrieves aggregated earnings data including overall totals, per-pool breakdown, and a detailed history of admin earnings with computed user earnings and position counts.",
  operationId: "getAggregatedEarnings",
  tags: ["Staking", "Admin", "Earnings"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "poolId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter earnings by pool ID",
    },
    {
      index: 1,
      name: "startDate",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter earnings by start date",
    },
    {
      index: 2,
      name: "endDate",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter earnings by end date",
    },
  ],
  responses: {
    200: {
      description: "Aggregated earnings retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totals: {
                type: "object",
                properties: {
                  totalUserEarnings: { type: "number" },
                  totalAdminEarnings: { type: "number" },
                  totalEarnings: { type: "number" },
                },
              },
              earningsByPool: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    poolId: { type: "string" },
                    poolName: { type: "string" },
                    totalUserEarnings: { type: "number" },
                    totalAdminEarnings: { type: "number" },
                    totalEarnings: { type: "number" },
                  },
                },
              },
              history: {
                type: "array",
                items: { type: "object" },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.staking.earning",
};

export default async (data: { user?: any; query?: any }) => {
  const { user, query } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Build common filter conditions for admin earnings.
    const adminWhere: any = {};
    const userWhere: any = {};

    if (query?.poolId) {
      adminWhere.poolId = query.poolId;
      // For user earnings, the pool condition is applied in the join.
    }
    if (query?.startDate) {
      const start = new Date(query.startDate);
      adminWhere.createdAt = {
        ...(adminWhere.createdAt || {}),
        [Op.gte]: start,
      };
      userWhere.createdAt = { ...(userWhere.createdAt || {}), [Op.gte]: start };
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      adminWhere.createdAt = { ...(adminWhere.createdAt || {}), [Op.lte]: end };
      userWhere.createdAt = { ...(userWhere.createdAt || {}), [Op.lte]: end };
    }

    // Query admin earnings records.
    const adminEarningsRecords = await models.stakingAdminEarning.findAll({
      where: adminWhere,
      raw: true,
    });

    // Aggregate admin earnings per pool.
    const aggregatedAdminByPool: Record<string, number> = {};
    let totalAdminEarnings = 0;
    for (const rec of adminEarningsRecords) {
      const poolId = rec.poolId;
      aggregatedAdminByPool[poolId] =
        (aggregatedAdminByPool[poolId] || 0) + rec.amount;
      totalAdminEarnings += rec.amount;
    }

    // Query user earnings aggregated by pool.
    const userEarningsAggregates = await models.stakingEarningRecord.findAll({
      attributes: [
        [fn("SUM", col("stakingEarningRecord.amount")), "totalUserEarnings"],
        [col("position.poolId"), "poolId"],
      ],
      include: [
        {
          model: models.stakingPosition,
          as: "position",
          attributes: [],
          where: query?.poolId ? { poolId: query.poolId } : undefined,
        },
      ],
      where: userWhere,
      group: ["position.poolId"],
      raw: true,
    });

    const aggregatedUserByPool: Record<string, number> = {};
    let totalUserEarnings = 0;
    for (const row of userEarningsAggregates) {
      const poolId = row.poolId;
      const sumUser = parseFloat(row.totalUserEarnings) || 0;
      aggregatedUserByPool[poolId] = sumUser;
      totalUserEarnings += sumUser;
    }

    const totalEarnings = totalAdminEarnings + totalUserEarnings;

    // Build per-pool earnings breakdown.
    const poolIds = new Set([
      ...Object.keys(aggregatedAdminByPool),
      ...Object.keys(aggregatedUserByPool),
    ]);
    const earningsByPool: any[] = [];
    for (const poolId of poolIds) {
      const pool = await models.stakingPool.findByPk(poolId, { raw: true });
      earningsByPool.push({
        poolId,
        poolName: pool ? pool.name : "Unknown",
        totalUserEarnings: aggregatedUserByPool[poolId] || 0,
        totalAdminEarnings: aggregatedAdminByPool[poolId] || 0,
        totalEarnings:
          (aggregatedUserByPool[poolId] || 0) +
          (aggregatedAdminByPool[poolId] || 0),
      });
    }

    // Build history: for each admin earning record, compute corresponding user earnings and count distinct positions for that day.
    const history = await Promise.all(
      adminEarningsRecords.map(async (adminRec) => {
        const startDate = new Date(adminRec.createdAt);
        const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        const userAgg = await models.stakingEarningRecord.findOne({
          attributes: [
            [fn("SUM", col("stakingEarningRecord.amount")), "userEarnings"],
            [
              fn("COUNT", fn("DISTINCT", col("position.id"))),
              "numberOfPositions",
            ],
          ],
          include: [
            {
              model: models.stakingPosition,
              as: "position",
              attributes: [],
              where: { poolId: adminRec.poolId },
            },
          ],
          where: {
            createdAt: {
              [Op.gte]: startDate,
              [Op.lt]: endDate,
            },
          },
          raw: true,
        });
        const userEarnings = parseFloat(userAgg?.userEarnings) || 0;
        const numberOfPositions = parseInt(userAgg?.numberOfPositions) || 0;
        return {
          id: adminRec.id,
          poolId: adminRec.poolId,
          createdAt: adminRec.createdAt,
          adminEarnings: adminRec.amount,
          userEarnings,
          numberOfPositions,
        };
      })
    );

    return {
      totals: { totalUserEarnings, totalAdminEarnings, totalEarnings },
      earningsByPool,
      history,
    };
  } catch (error) {
    console.error("Error fetching aggregated earnings:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch aggregated earnings",
    });
  }
};
