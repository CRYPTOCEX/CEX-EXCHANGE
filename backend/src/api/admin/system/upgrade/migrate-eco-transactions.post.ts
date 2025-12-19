import { models } from "@b/db";
import { Op, col } from "sequelize";
import {
  serverErrorResponse,
  unauthorizedResponse,
  notFoundMetadataResponse,
} from "@b/utils/query";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Migrate ECO Transaction Reference IDs",
  operationId: "migrateEcoTransactions",
  tags: ["Admin", "System", "Upgrade"],
  description: "Migrates ECO wallet transactions by moving referenceId values to trxId field and setting referenceId to null.",
  responses: {
    200: {
      description: "Migration completed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                description: "Whether the migration was successful"
              },
              updated: {
                type: "number",
                description: "Number of transactions updated"
              },
              message: {
                type: "string",
                description: "Migration result message"
              }
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_SYS",
  logTitle: "Migrate ECO transactions",
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    ctx?.step("Finding ECO transactions with referenceId");
    // Find all transactions with wallet type ECO that have a referenceId
    const [updatedCount] = await models.transaction.update(
      {
        trxId: col('referenceId'),
        referenceId: null
      },
      {
        where: {
          type: 'ECO',
          referenceId: {
            [Op.ne]: null
          }
        }
      }
    );

    ctx?.success(`Successfully migrated ${updatedCount} ECO transactions`);

    return {
      success: true,
      updated: updatedCount,
      message: `Successfully migrated ${updatedCount} ECO transactions`
    };
  } catch (error) {
    logger.error("SYSTEM", "Error migrating ECO transactions", error);
    ctx?.fail(`Failed to migrate ECO transactions: ${error.message}`);
    throw new Error("Failed to migrate ECO transactions");
  }
}; 