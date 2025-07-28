import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { wishlistUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce wishlist entry",
  operationId: "updateEcommerceWishlist",
  tags: ["Admin", "Ecommerce", "Wishlist"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the wishlist entry to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the wishlist entry",
    content: {
      "application/json": {
        schema: wishlistUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Wishlist"),
  requiresAuth: true,
  permission: "edit.ecommerce.wishlist",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { userId, productId } = body;

  return await updateRecord("ecommerceWishlist", id, {
    userId,
    productId,
  });
};
