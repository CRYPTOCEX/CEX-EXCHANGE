import { updateStatus } from "@b/utils/query";
import { statusUpdateResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Bulk update campaign status",
  operationId: "bulkUpdateMailwizardCampaignStatus",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  description:
    "Updates the status of multiple Mailwizard campaigns simultaneously. Valid statuses: PENDING, PAUSED, ACTIVE, STOPPED, COMPLETED, CANCELLED. This allows for efficient batch status changes across multiple campaigns.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of Mailwizard Campaign IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: [
                "PENDING",
                "PAUSED",
                "ACTIVE",
                "STOPPED",
                "COMPLETED",
                "CANCELLED",
              ],
              description: "New status to apply to the Mailwizard Campaigns",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: statusUpdateResponses("Mailwizard Campaign"),
  requiresAuth: true,
  permission: "edit.mailwizard.campaign",
  logModule: "ADMIN_MAIL",
  logTitle: "Bulk update campaign status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status of ${ids.length} campaigns to ${status}`);
  const result = await updateStatus("mailwizardCampaign", ids, status);

  ctx?.success(`${ids.length} campaigns status updated successfully`);
  return result;
};
