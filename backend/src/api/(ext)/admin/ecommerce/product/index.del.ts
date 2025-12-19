// /server/api/ecommerce/products/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes ecommerce products by IDs",
  operationId: "bulkDeleteEcommerceProducts",
  tags: ["Admin", "Ecommerce", "Product"],
  description: "Deletes multiple ecommerce products at once using an array of product IDs. This operation will cascade delete all associated reviews, discounts, and wishlist items.",
  parameters: commonBulkDeleteParams("Ecommerce Products"),
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
              description: "Array of ecommerce product IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Ecommerce Products"),
  requiresAuth: true,
  permission: "delete.ecommerce.product",
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk Delete Ecommerce Products",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Deleting E-commerce products");
  const result = await handleBulkDelete({
    model: "ecommerceProduct",
    ids,
    query,
  });

  ctx?.success("Successfully deleted E-commerce products");
  return result;
};
