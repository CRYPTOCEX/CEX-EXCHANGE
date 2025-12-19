// /server/api/mailwizard/campaigns/delete.del.ts

import { commonBulkDeleteParams, handleBulkDelete } from "@b/utils/query";
import { bulkDeleteResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Bulk delete Mailwizard campaigns",
  description:
    "Permanently deletes multiple Mailwizard campaigns by their IDs. This operation cannot be undone and will remove all campaign data including targets and execution history.",
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
  responses: bulkDeleteResponses("Mailwizard Campaign"),
  requiresAuth: true,
  permission: "delete.mailwizard.campaign",
  logModule: "ADMIN_MAIL",
  logTitle: "Bulk delete campaigns",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Deleting ${ids.length} campaigns`);
  const result = await handleBulkDelete({
    model: "mailwizardCampaign",
    ids,
    query,
  });

  ctx?.success(`${ids.length} campaigns deleted successfully`);
  return result;
};
