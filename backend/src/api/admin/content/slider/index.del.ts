import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes sliders by IDs",
  operationId: "bulkDeleteSliders",
  tags: ["Admin", "Sliders"],
  parameters: commonBulkDeleteParams("Sliders"),
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
              description: "Array of slider IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Sliders"),
  requiresAuth: true,
  permission: "delete.slider",
  logModule: "ADMIN_CMS",
  logTitle: "Bulk delete sliders",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Bulk deleting ${ids?.length || 0} slider(s)`);
  const result = await handleBulkDelete({
    model: "slider",
    ids,
    query,
  });

  ctx?.success("Successfully deleted slider(s)");
  return result;
};
