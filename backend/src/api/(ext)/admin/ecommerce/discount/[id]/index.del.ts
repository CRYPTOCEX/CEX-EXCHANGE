import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific ecommerce discount by ID",
  operationId: "deleteEcommerceDiscountById",
  description:
    "Permanently deletes a single ecommerce discount record by its unique identifier. This will remove the discount code and all associated relationships. Any customers who have used this discount will retain their historical usage records.",
  tags: ["Admin", "Ecommerce", "Discount"],
  parameters: deleteRecordParams("E-commerce discount"),
  responses: deleteRecordResponses("E-commerce discount"),
  permission: "delete.ecommerce.discount",
  requiresAuth: true,
  logModule: "ADMIN_ECOM",
  logTitle: "Delete discount",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating discount ID");
  ctx?.step(`Deleting discount: ${params.id}`);

  const result = await handleSingleDelete({
    model: "ecommerceDiscount",
    id: params.id,
    query,
  });

  ctx?.success("Discount deleted successfully");
  return result;
};
