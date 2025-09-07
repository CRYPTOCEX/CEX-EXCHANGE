import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get External Pool Performance",
  description:
    "Retrieves external pool performance data with optional filtering by pool ID and date range.",
  operationId: "getExternalPoolPerformance",
  tags: ["Staking", "Admin", "Performance"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "poolId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter performance by pool ID",
    },
    {
      index: 1,
      name: "startDate",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter performance by start date",
    },
    {
      index: 2,
      name: "endDate",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter performance by end date",
    },
  ],
  responses: {
    200: {
      description: "Performance data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
  permission: "view.staking.performance",
};

export default async (data: { user?: any; query?: any }) => {
  const { user, query } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
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

    return performances;
  } catch (error) {
    console.error("Error fetching external pool performance:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch external pool performance",
    });
  }
};
