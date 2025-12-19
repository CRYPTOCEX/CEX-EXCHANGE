import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific ecommerce product by ID",
  operationId: "deleteEcommerceProduct",
  tags: ["Admin", "Ecommerce", "Product"],
  description: "Permanently deletes a single ecommerce product by its ID. This operation will cascade delete all associated reviews, discounts, and wishlist items.",
  parameters: deleteRecordParams("E-commerce product"),
  responses: deleteRecordResponses("E-commerce product"),
  permission: "delete.ecommerce.product",
  requiresAuth: true,
  logModule: "ADMIN_ECOM",
  logTitle: "Delete Ecommerce Product",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting E-commerce product");
  const result = await handleSingleDelete({
    model: "ecommerceProduct",
    id: params.id,
    query,
  });

  ctx?.success("Successfully deleted E-commerce product");
  return result;
};
