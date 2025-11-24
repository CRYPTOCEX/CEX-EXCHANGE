// /server/api/ecommerce/products/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes e-commerce products by IDs",
  operationId: "bulkDeleteEcommerceProducts",
  tags: ["Admin", "Ecommerce", "Products"],
  parameters: commonBulkDeleteParams("E-commerce Products"),
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
              description: "Array of e-commerce product IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("E-commerce Products"),
  requiresAuth: true,
  permission: "delete.ecommerce.product",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "ecommerceProduct",
    ids,
    query,
  });
};
