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
  logModule: "ADMIN_ECOM",
  logTitle: "Update E-commerce Wishlist Entry",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { userId, productId } = body;

  ctx?.step("Updating E-commerce wishlist entry");
  const result = await updateRecord("ecommerceWishlist", id, {
    userId,
    productId,
  });

  ctx?.success("Successfully updated E-commerce wishlist entry");
  return result;
};
