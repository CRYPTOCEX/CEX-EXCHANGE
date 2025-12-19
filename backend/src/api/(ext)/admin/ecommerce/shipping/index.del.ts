// /server/api/ecommerce/Shipping/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes e-commerce Shipping by IDs",
  operationId: "bulkDeleteEcommerceShipping",
  tags: ["Admin", "Ecommerce", "Shipping"],
  parameters: commonBulkDeleteParams("E-commerce Shipping"),
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
              description: "Array of e-commerce shipping IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("E-commerce Shipping"),
  requiresAuth: true,
  permission: "delete.ecommerce.shipping",
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk Delete E-commerce Shipping",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Deleting E-commerce shipping records");
  const result = await handleBulkDelete({
    model: "ecommerceShipping",
    ids,
    query,
  });

  ctx?.success("Successfully deleted E-commerce shipping records");
  return result;
};
