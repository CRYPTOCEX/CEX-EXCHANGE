// /server/api/ecommerce/discounts/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes ecommerce discounts by IDs",
  operationId: "bulkDeleteEcommerceDiscounts",
  tags: ["Admin", "Ecommerce", "Discount"],
  description:
    "Deletes multiple ecommerce discount records in a single operation. This endpoint accepts an array of discount IDs and removes them from the database. All associated discount codes and their product relationships will be permanently deleted.",
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
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk delete discounts",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Validating ${ids.length} discount IDs`);
  ctx?.step("Performing bulk delete operation");

  const result = await handleBulkDelete({
    model: "ecommerceDiscount",
    ids,
    query,
  });

  ctx?.success(`Successfully deleted ${ids.length} discounts`);
  return result;
};
