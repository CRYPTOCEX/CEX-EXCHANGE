import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific e-commerce review",
  operationId: "deleteEcommerceReview",
  tags: ["Admin", "Ecommerce", "Reviews"],
  parameters: deleteRecordParams("E-commerce review"),
  responses: deleteRecordResponses("E-commerce review"),
  permission: "delete.ecommerce.review",
  requiresAuth: true,
  logModule: "ADMIN_ECOM",
  logTitle: "Delete E-commerce Review",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting E-commerce review");
  const result = await handleSingleDelete({
    model: "ecommerceReview",
    id: params.id,
    query,
  });

  ctx?.success("Successfully deleted E-commerce review");
  return result;
};
