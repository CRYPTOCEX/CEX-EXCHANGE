import { updateRecordResponses, updateStatus } from "@b/utils/query";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Bulk updates the status of extensions",
  operationId: "bulkUpdateExtensionStatus",
  tags: ["Admin", "Extensions"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of extension IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the extensions (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Extension"),
  requiresAuth: true,
  permission: "edit.extension",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;

  // Update the statuses in the database
  const updateResult = await updateStatus("extension", ids, status);

  // Clear cache after update
  const cacheManager = CacheManager.getInstance();
  await cacheManager.clearCache();

  return updateResult;
};
