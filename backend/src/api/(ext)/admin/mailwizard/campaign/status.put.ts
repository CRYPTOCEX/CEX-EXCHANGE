import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of Mailwizard Campaigns",
  operationId: "bulkUpdateMailwizardCampaignStatus",
  tags: ["Admin", "Mailwizard Campaigns"],
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
  responses: updateRecordResponses("Mailwizard Campaign"),
  requiresAuth: true,
  permission: "edit.mailwizard.campaign",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("mailwizardCampaign", ids, status);
};
