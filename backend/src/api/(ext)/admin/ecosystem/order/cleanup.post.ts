import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { cleanupCorruptedOrders } from "@b/api/(ext)/ecosystem/utils/scylla/cleanup";

export const metadata = {
  summary: "Cleanup corrupted ecosystem orders",
  description:
    "Removes corrupted ecosystem orders with null essential fields. These are ghost records created by ScyllaDB's upsert behavior. Supports dry-run mode to preview what would be deleted.",
  operationId: "cleanupCorruptedEcosystemOrders",
  tags: ["Admin", "Ecosystem", "Order", "Maintenance"],
  logModule: "ADMIN_ECO",
  logTitle: "Cleanup corrupted orders",
  requestBody: {
    description: "Cleanup options",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            dryRun: {
              type: "boolean",
              description: "If true, only count corrupted orders without deleting them",
              default: false,
            },
            limit: {
              type: "number",
              description: "Maximum number of orders to scan",
              default: 10000,
              minimum: 1,
              maximum: 100000,
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Cleanup operation completed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalScanned: {
                type: "number",
                description: "Total number of orders scanned",
              },
              corruptedFound: {
                type: "number",
                description: "Number of corrupted orders found",
              },
              deleted: {
                type: "number",
                description: "Number of orders deleted (0 in dry-run mode)",
              },
              errors: {
                type: "number",
                description: "Number of errors encountered during deletion",
              },
              dryRun: {
                type: "boolean",
                description: "Whether this was a dry-run operation",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "manage.ecosystem.order",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const dryRun = body?.dryRun ?? false;
  const limit = body?.limit ?? 10000;

  ctx?.step("Validating cleanup parameters");

  // Validate limit
  if (limit < 1 || limit > 100000) {
    throw new Error("Limit must be between 1 and 100,000");
  }

  if (dryRun) {
    ctx?.step(`Performing dry-run cleanup scan (limit: ${limit})`);
  } else {
    ctx?.step(`Performing cleanup operation (limit: ${limit})`);
  }

  const stats = await cleanupCorruptedOrders(dryRun, limit);

  ctx?.success(
    dryRun
      ? `Dry-run complete: found ${stats.corruptedFound} corrupted orders out of ${stats.totalScanned} scanned`
      : `Cleanup complete: deleted ${stats.deleted} corrupted orders out of ${stats.corruptedFound} found`
  );

  return {
    ...stats,
    dryRun,
  };
};
