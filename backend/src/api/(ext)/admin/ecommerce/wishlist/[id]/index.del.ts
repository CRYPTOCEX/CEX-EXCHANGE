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
  logModule: "ADMIN_ECOM",
  logTitle: "Delete E-commerce Wishlist Entry",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting E-commerce wishlist entry");
  const result = await handleSingleDelete({
    model: "ecommerceWishlist",
    id: params.id,
    query,
  });

  ctx?.success("Successfully deleted E-commerce wishlist entry");
  return result;
};
