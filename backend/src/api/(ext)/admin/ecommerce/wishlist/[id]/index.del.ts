import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific e-commerce wishlist entry",
  operationId: "deleteEcommerceWishlist",
  tags: ["Admin", "Ecommerce", "Wishlists"],
  parameters: deleteRecordParams("E-commerce wishlist entry"),
  responses: deleteRecordResponses("E-commerce wishlist entry"),
  permission: "delete.ecommerce.wishlist",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "ecommerceWishlist",
    id: params.id,
    query,
  });
};
