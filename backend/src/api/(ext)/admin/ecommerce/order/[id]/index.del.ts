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
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "ecommerceOrder",
    id: params.id,
    query,
  });
};
