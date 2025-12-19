import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of CMS pages",
  operationId: "bulkUpdatePageStatus",
  tags: ["Admin", "Content", "Page"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of page IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              description: "New status to apply to the pages",
              enum: ["PUBLISHED", "DRAFT"],
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Page"),
  requiresAuth: true,
  permission: "edit.page",
  logModule: "ADMIN_CMS",
  logTitle: "Bulk update page status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status of ${ids?.length || 0} page(s) to ${status}`);
  const result = await updateStatus("page", ids, status);

  ctx?.success(`Successfully updated page status`);
  return result;
};
