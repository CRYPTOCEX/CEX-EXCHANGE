// /server/api/ecommerce/orders/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes e-commerce orders by IDs",
  operationId: "bulkDeleteEcommerceOrders",
  tags: ["Admin", "Ecommerce", "Orders"],
  parameters: commonBulkDeleteParams("E-commerce Orders"),
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
              description: "Array of e-commerce order IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("E-commerce Orders"),
  requiresAuth: true,
  permission: "delete.ecommerce.order",
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk delete orders",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} order IDs`);
  ctx?.step("Performing bulk delete operation");

  const result = await handleBulkDelete({
    model: "ecommerceOrder",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} orders`);
  return result;
};
