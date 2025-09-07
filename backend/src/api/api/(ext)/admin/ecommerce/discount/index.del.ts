// /server/api/ecommerce/discounts/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes e-commerce discounts by IDs",
  operationId: "bulkDeleteEcommerceDiscounts",
  tags: ["Admin", "Ecommerce", "Discounts"],
  parameters: commonBulkDeleteParams("E-commerce Discounts"),
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
              description: "Array of e-commerce discount IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("E-commerce Discounts"),
  requiresAuth: true,
  permission: "delete.ecommerce.discount",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "ecommerceDiscount",
    ids,
    query,
  });
};
