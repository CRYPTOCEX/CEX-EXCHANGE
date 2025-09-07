import { models } from "@b/db";
import { updateRecordResponses } from "@b/utils/query";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Update Status for an Extension",
  operationId: "updateExtensionStatus",
  tags: ["Admin", "Extensions"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Extension to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply to the Extension (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Extension"),
  requiresAuth: true,
  permission: "edit.extension",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;

  try {
    // Update the status in the database
    await models.extension.update({ status }, { where: { productId: id } });

    // Clear the cache to ensure updated status is reflected
    const cacheManager = CacheManager.getInstance();
    await cacheManager.clearCache();

    return { message: "Extension status updated successfully" };
  } catch (error) {
    console.error("Error updating extension status:", error);
    return { message: "Failed to update extension status", error };
  }
};
