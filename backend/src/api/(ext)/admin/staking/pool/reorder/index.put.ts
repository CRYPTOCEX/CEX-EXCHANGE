import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Reorder staking pools display order",
  operationId: "reorderStakingPools",
  tags: ["Admin", "Staking", "Pool", "Reorder"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["poolOrders"],
          properties: {
            poolOrders: {
              type: "array",
              description: "Array of pool IDs in desired order",
              items: {
                type: "object",
                required: ["poolId", "order"],
                properties: {
                  poolId: { type: "string", format: "uuid" },
                  order: { type: "integer", minimum: 0 }
                }
              }
            }
          }
        }
      }
    }
  },
  responses: {
    200: {
      description: "Pools reordered successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              updated: { type: "integer" }
            }
          }
        }
      }
    },
    400: { description: "Invalid request data" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden - Admin access required" },
    500: { description: "Internal Server Error" }
  },
  requiresAuth: true,
  permission: "access.staking.management"
};

export default async (data: Handler) => {
  const { user, body } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { poolOrders } = body;

  // Validate input
  if (!Array.isArray(poolOrders) || poolOrders.length === 0) {
    throw createError({
      statusCode: 400,
      message: "poolOrders must be a non-empty array"
    });
  }

  // Validate each pool order entry
  const poolIds = new Set<string>();
  const orders = new Set<number>();
  
  for (const entry of poolOrders) {
    if (!entry.poolId || typeof entry.poolId !== "string") {
      throw createError({
        statusCode: 400,
        message: "Each entry must have a valid poolId"
      });
    }
    
    if (typeof entry.order !== "number" || entry.order < 0 || !Number.isInteger(entry.order)) {
      throw createError({
        statusCode: 400,
        message: "Each entry must have a valid non-negative integer order"
      });
    }
    
    // Check for duplicate pool IDs
    if (poolIds.has(entry.poolId)) {
      throw createError({
        statusCode: 400,
        message: `Duplicate poolId found: ${entry.poolId}`
      });
    }
    poolIds.add(entry.poolId);
    
    // Check for duplicate orders
    if (orders.has(entry.order)) {
      throw createError({
        statusCode: 400,
        message: `Duplicate order value found: ${entry.order}`
      });
    }
    orders.add(entry.order);
  }

  const transaction = await sequelize.transaction();

  try {
    // Verify all pools exist
    const existingPools = await models.stakingPool.findAll({
      where: {
        id: Array.from(poolIds)
      },
      attributes: ["id"],
      transaction
    });

    if (existingPools.length !== poolIds.size) {
      const existingIds = new Set(existingPools.map(p => p.id));
      const missingIds = Array.from(poolIds).filter(id => !existingIds.has(id));
      
      throw createError({
        statusCode: 400,
        message: `Pool(s) not found: ${missingIds.join(", ")}`
      });
    }

    // Update pool orders
    const updatePromises = poolOrders.map(({ poolId, order }) =>
      models.stakingPool.update(
        { displayOrder: order },
        {
          where: { id: poolId },
          transaction
        }
      )
    );

    await Promise.all(updatePromises);

    // Create admin activity log
    await models.stakingAdminActivity.create({
      userId: user.id,
      action: "reorder",
      type: "pools",
      relatedId: null,
      metadata: {
        poolCount: poolOrders.length,
        poolOrders: poolOrders
      }
    }, { transaction });

    await transaction.commit();

    return {
      message: "Staking pools reordered successfully",
      updated: poolOrders.length
    };

  } catch (error) {
    await transaction.rollback();
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to reorder pools"
    });
  }
};