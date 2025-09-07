// /server/api/mailwizard/campaigns/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes Mailwizard campaigns by IDs",
  operationId: "bulkDeleteMailwizardCampaigns",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  parameters: commonBulkDeleteParams("Mailwizard Campaigns"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of Mailwizard campaign IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Mailwizard Campaigns"),
  requiresAuth: true,
  permission: "delete.mailwizard.campaign",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "mailwizardCampaign",
    ids,
    query,
  });
};
