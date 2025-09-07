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
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "slider",
    ids,
    query,
  });
};
