import { handleSingleDelete } from "@b/utils/query";

export const metadata = {
  summary: "Deletes a specific Admin Profit record",
  operationId: "deleteAdminProfit",
  tags: ["Admin", "Finance", "Profits"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the Admin Profit to delete",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "restore",
      in: "query",
      description: "Restore the Admin Profit instead of deleting",
      required: false,
      schema: { type: "boolean" },
    },
    {
      name: "force",
      in: "query",
      description: "Delete the Admin Profit permanently",
      required: false,
      schema: { type: "boolean" },
    },
  ],
  responses: {
    200: {
      description: "Admin Profit deleted successfully",
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
  permission: "delete.admin.profit",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  const { id } = params;

  return await handleSingleDelete({
    model: "adminProfit",
    id,
    query,
  });
};
