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
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "ecommerceShipping",
    ids,
    query,
  });
};
