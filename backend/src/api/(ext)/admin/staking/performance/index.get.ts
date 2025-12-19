import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import {
  unauthorizedResponse,
  serverErrorResponse,
  commonFields,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "List External Pool Performance Records",
  operationId: "listExternalPoolPerformance",
  description:
    "Retrieves historical performance data for external staking pools. Performance records track daily metrics including APR, total staked amounts, profit, and notes. Can be filtered by specific pool and date range to analyze pool performance over time.",
  tags: ["Admin", "Staking", "Performance"],
  requiresAuth: true,
  logModule: "ADMIN_STAKE",
  logTitle: "Get Staking Performance",
  parameters: [
    {
      index: 0,
      name: "poolId",
      in: "query",
      required: false,
      schema: { type: "string", format: "uuid" },
      description: "Filter performance records by pool ID",
    },
    {
      index: 1,
      name: "startDate",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter performance records from this date onwards",
    },
    {
      index: 2,
      name: "endDate",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter performance records up to this date",
    },
  ],
  responses: {
    200: {
      description: "Performance data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ...commonFields,
                poolId: { type: "string", format: "uuid" },
                date: { type: "string", format: "date-time" },
                apr: {
                  type: "number",
                  description: "Annual Percentage Rate on this date",
                },
                totalStaked: {
                  type: "number",
                  description: "Total amount staked in the pool",
                },
                profit: {
                  type: "number",
                  description: "Profit generated on this date",
                },
                notes: {
                  type: "string",
                  description: "Additional notes about performance",
                },
                pool: {
                  type: "object",
                  description: "Associated staking pool details",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.staking.performance",
};

export default async (data: { user?: any; query?: any, ctx }) => {
  const { user, query, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    ctx?.step("Fetching data");
    // Build filter conditions
    const where: any = {};

    if (query?.poolId) {
      where.poolId = query.poolId;
    }

    if (query?.startDate) {
      where.date = {
        ...where.date,
        [Op.gte]: new Date(query.startDate),
      };
    }

    if (query?.endDate) {
      where.date = {
        ...where.date,
        [Op.lte]: new Date(query.endDate),
      };
    }

    // Fetch external performance data with their pool
    const performances = await models.stakingExternalPoolPerformance.findAll({
      where,
      include: [
        {
          model: models.stakingPool,
          as: "pool",
        },
      ],
      order: [["date", "DESC"]],
    });

    ctx?.success("Operation completed successfully");
    return performances;
  } catch (error) {
    console.error("Error fetching external pool performance:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch external pool performance",
    });
  }
};
