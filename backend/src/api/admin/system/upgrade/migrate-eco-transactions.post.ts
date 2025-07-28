import { models } from "@b/db";
import { Op, col } from "sequelize";
import {
  serverErrorResponse,
  unauthorizedResponse,
  notFoundMetadataResponse,
} from "@b/utils/query";

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
};

export default async (data: Handler) => {
  const { user } = data;
  
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  try {
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

    return {
      success: true,
      updated: updatedCount,
      message: `Successfully migrated ${updatedCount} ECO transactions`
    };
  } catch (error) {
    console.error("Error migrating ECO transactions:", error);
    throw new Error("Failed to migrate ECO transactions");
  }
}; 