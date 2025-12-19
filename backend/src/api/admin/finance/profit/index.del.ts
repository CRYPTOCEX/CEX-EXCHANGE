import { handleBulkDelete } from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes Admin Profits by IDs",
  operationId: "bulkDeleteAdminProfits",
  tags: ["Admin", "Finance", "Profits"],
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
              description: "Array of Admin Profit IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Admin Profits deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
  requiresAuth: true,
  permission: "delete.admin.profit",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Delete Admin Profits",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  return handleBulkDelete({
    model: "adminProfit",
    ids,
    query,
  });
};
