// /server/api/pages/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes pages by IDs",
  operationId: "bulkDeletePages",
  tags: ["Admin", "Content", "Page"],
  parameters: commonBulkDeleteParams("Pages"),
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
              description: "Array of page IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Pages"),
  requiresAuth: true,
  permission: "delete.page",
  logModule: "ADMIN_CMS",
  logTitle: "Bulk delete pages",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Bulk deleting ${ids?.length || 0} page(s)`);
  const result = await handleBulkDelete({
    model: "page",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted page(s)`);
  return result;
};
