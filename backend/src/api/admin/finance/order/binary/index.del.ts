// /server/api/admin/binary/orders/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes binary orders by IDs",
  operationId: "bulkDeleteBinaryOrders",
  tags: ["Admin", "Binary Orders"],
  parameters: commonBulkDeleteParams("Binary Orders"),
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
              description: "Array of binary order IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Binary Orders"),
  requiresAuth: true,
  permission: "delete.binary.order",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Delete Binary Orders",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Delete Binary Orders...");
  const result = await handleBulkDelete({
    model: "binaryOrder",
    ids,
    query,
  });

  ctx?.success("Bulk Delete Binary Orders completed successfully");
  return result;
};
