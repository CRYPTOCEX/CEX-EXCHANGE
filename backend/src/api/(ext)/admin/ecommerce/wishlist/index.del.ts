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
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk Delete E-commerce Wishlist Entries",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Deleting E-commerce wishlist entries");
  const result = await handleBulkDelete({
    model: "ecommerceWishlist",
    ids,
    query,
  });

  ctx?.success("Successfully deleted E-commerce wishlist entries");
  return result;
};
