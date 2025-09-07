// /server/api/ecommerce/categories/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes e-commerce categories by IDs",
  operationId: "bulkDeleteEcommerceCategories",
  tags: ["Admin", "Ecommerce", "Categories"],
  parameters: commonBulkDeleteParams("E-commerce Categories"),
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
              description: "Array of e-commerce category IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("E-commerce Categories"),
  requiresAuth: true,
  permission: "delete.ecommerce.category",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "ecommerceCategory",
    ids,
    query,
  });
};
