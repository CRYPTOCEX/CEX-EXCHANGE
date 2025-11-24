import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { literal } from "sequelize";

export const metadata = {
  summary: "Get Staking Pool by ID",
  description: "Retrieves a specific staking pool by its ID with related data.",
  operationId: "getStakingPoolById",
  tags: ["Staking", "Admin", "Pools"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Pool ID",
    },
  ],
  responses: {
    200: {
      description: "Pool retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "Pool not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.staking.pool",
};

export default async (data: { user?: any; params?: any }) => {
  const { user, params } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const poolId = params.id;
  if (!poolId) {
    throw createError({ statusCode: 400, message: "Pool ID is required" });
  }

  try {
    const pool = await models.stakingPool.findOne({
      where: { id: poolId },
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
    });

    if (!pool) {
      throw createError({ statusCode: 404, message: "Pool not found" });
    }

    return pool;
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(`Error fetching staking pool ${poolId}:`, error);
    throw createError({
      statusCode: 500,
      message: `Failed to fetch staking pool ${poolId}`,
    });
  }
};
