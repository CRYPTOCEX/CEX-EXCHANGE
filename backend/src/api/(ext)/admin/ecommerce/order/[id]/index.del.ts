import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific e-commerce order",
  operationId: "deleteEcommerceOrder",
  tags: ["Admin", "Ecommerce", "Orders"],
  parameters: deleteRecordParams("E-commerce order"),
  responses: deleteRecordResponses("E-commerce order"),
  permission: "delete.ecommerce.order",
  requiresAuth: true,
  logModule: "ADMIN_ECOM",
  logTitle: "Delete order",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating order ID");
  ctx?.step(`Deleting order: ${params.id}`);

  const result = await handleSingleDelete({
    model: "ecommerceOrder",
    id: params.id,
    query,
  });

  ctx?.success("Order deleted successfully");
  return result;
};
