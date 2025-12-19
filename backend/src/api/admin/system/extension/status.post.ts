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
  logModule: "ADMIN_SYS",
  logTitle: "Bulk update extension status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating ${ids.length} extensions to ${status ? "active" : "inactive"}`);
  // Update the statuses in the database
  const updateResult = await updateStatus("extension", ids, status);

  ctx?.step("Clearing cache");
  // Clear cache after update
  const cacheManager = CacheManager.getInstance();
  await cacheManager.clearCache();

  ctx?.success(`${ids.length} extension statuses updated successfully`);
  return updateResult;
};
