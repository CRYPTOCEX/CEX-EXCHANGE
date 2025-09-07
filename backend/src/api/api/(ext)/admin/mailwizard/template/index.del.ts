// /server/api/mailwizard/templates/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes Mailwizard templates by IDs",
  operationId: "bulkDeleteMailwizardTemplates",
  tags: ["Admin", "Mailwizard", "Templates"],
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
  responses: commonBulkDeleteResponses("Mailwizard Templates"),
  requiresAuth: true,
  permission: "delete.mailwizard.template",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "mailwizardTemplate",
    ids,
    query,
  });
};
