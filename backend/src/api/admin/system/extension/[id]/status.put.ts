import { models } from "@b/db";
import { updateRecordResponses } from "@b/utils/query";
import { CacheManager } from "@b/utils/cache";
import { logger } from "@b/utils/console";

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
  logModule: "ADMIN_SYS",
  logTitle: "Update extension status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  try {
    ctx?.step(`Updating extension ${id} status to ${status ? "active" : "inactive"}`);
    // Update the status in the database
    await models.extension.update({ status }, { where: { productId: id } });

    ctx?.step("Clearing cache");
    // Clear the cache to ensure updated status is reflected
    const cacheManager = CacheManager.getInstance();
    await cacheManager.clearCache();

    ctx?.success("Extension status updated successfully");
    return { message: "Extension status updated successfully" };
  } catch (error) {
    logger.error("EXTENSION", "Error updating extension status", error);
    ctx?.fail(`Failed to update extension status: ${error.message}`);
    return { message: "Failed to update extension status", error };
  }
};
