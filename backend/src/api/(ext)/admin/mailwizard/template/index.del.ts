// /server/api/mailwizard/templates/delete.del.ts

import { commonBulkDeleteParams, handleBulkDelete } from "@b/utils/query";
import { bulkDeleteResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Bulk delete Mailwizard templates",
  operationId: "bulkDeleteMailwizardTemplates",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Permanently deletes multiple Mailwizard templates by their IDs. This operation cannot be undone. Templates that are currently in use by active campaigns cannot be deleted.",
  parameters: commonBulkDeleteParams("Mailwizard Templates"),
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
              description: "Array of Mailwizard template IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: bulkDeleteResponses("Mailwizard Template"),
  requiresAuth: true,
  permission: "delete.mailwizard.template",
  logModule: "ADMIN_MAIL",
  logTitle: "Bulk delete templates",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Deleting ${ids.length} templates`);
  const result = await handleBulkDelete({
    model: "mailwizardTemplate",
    ids,
    query,
  });

  ctx?.success(`${ids.length} templates deleted successfully`);
  return result;
};
