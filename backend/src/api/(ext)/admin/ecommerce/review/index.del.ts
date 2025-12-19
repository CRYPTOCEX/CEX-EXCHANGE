// /server/api/ecommerce/reviews/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes e-commerce reviews by IDs",
  operationId: "bulkDeleteEcommerceReviews",
  tags: ["Admin", "Ecommerce", "Reviews"],
  parameters: commonBulkDeleteParams("E-commerce Reviews"),
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
              description: "Array of e-commerce review IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("E-commerce Reviews"),
  requiresAuth: true,
  permission: "delete.ecommerce.review",
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk Delete E-commerce Reviews",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Deleting E-commerce reviews");
  const result = await handleBulkDelete({
    model: "ecommerceReview",
    ids,
    query,
  });

  ctx?.success("Successfully deleted E-commerce reviews");
  return result;
};
