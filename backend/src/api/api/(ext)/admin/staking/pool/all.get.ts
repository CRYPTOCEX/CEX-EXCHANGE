import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, literal } from "sequelize";

export const metadata = {
  summary: "Get Staking Pools",
  description:
    "Retrieves all staking pools with optional filtering by status, search term, APR range, and token.",
  operationId: "getStakingPools",
  tags: ["Staking", "Admin", "Pools"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "status",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE", "COMING_SOON"],
      },
      description: "Filter pools by status",
    },
    {
      index: 1,
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Search term to filter pools by name, token, or symbol",
    },
    {
      index: 2,
      name: "minApr",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Minimum APR value",
    },
    {
      index: 3,
      name: "maxApr",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Maximum APR value",
    },
    {
      index: 4,
      name: "token",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter pools by token",
    },
  ],
  responses: {
    200: {
      description: "Pools retrieved successfully",
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
  permission: "view.staking.pool",
};

export default async (data: { user?: any; query?: any }) => {
  const { user, query } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Build filter conditions
    const where: any = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      const searchTerm = `%${query.search}%`;
      where[Op.or] = [
        { name: { [Op.like]: searchTerm } },
        { token: { [Op.like]: searchTerm } },
        { symbol: { [Op.like]: searchTerm } },
      ];
    }

    if (query?.minApr !== undefined) {
      where.apr = {
        ...where.apr,
        [Op.gte]: Number.parseFloat(query.minApr),
      };
    }

    if (query?.maxApr !== undefined) {
      where.apr = {
        ...where.apr,
        [Op.lte]: Number.parseFloat(query.maxApr),
      };
    }

    if (query?.token) {
      where.token = query.token;
    }

    // Fetch pools with computed fields added via attributes
    const pools = await models.stakingPool.findAll({
      where,
      attributes: {
        include: [
          [
            literal(`(
              SELECT COALESCE(SUM(sp.amount), 0)
              FROM staking_positions AS sp
              WHERE sp.poolId = stakingPool.id
            )`),
            "totalStaked",
          ],
        ],
      },
      include: [
        {
          model: models.stakingPosition,
          as: "positions",
          required: false,
        },
        {
          model: models.stakingAdminEarning,
          as: "adminEarnings",
          required: false,
        },
        {
          model: models.stakingExternalPoolPerformance,
          as: "performances",
          required: false,
        },
      ],
      order: [["order", "ASC"]],
    });

    return pools;
  } catch (error) {
    console.error("Error fetching staking pools:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch staking pools",
    });
  }
};
