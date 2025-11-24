// /server/api/ecommerce/wishlists/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes e-commerce wishlist entries by IDs",
  operationId: "bulkDeleteEcommerceWishlists",
  tags: ["Admin", "Ecommerce", "Wishlists"],
  parameters: commonBulkDeleteParams("E-commerce Wishlist Entries"),
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
              description: "Array of e-commerce wishlist entry IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("E-commerce Wishlist Entries"),
  requiresAuth: true,
  permission: "delete.ecommerce.wishlist",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "ecommerceWishlist",
    ids,
    query,
  });
};
