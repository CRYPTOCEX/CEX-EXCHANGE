import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific e-commerce product",
  operationId: "deleteEcommerceProduct",
  tags: ["Admin", "Ecommerce", "Products"],
  parameters: deleteRecordParams("E-commerce product"),
  responses: deleteRecordResponses("E-commerce product"),
  permission: "delete.ecommerce.product",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "ecommerceProduct",
    id: params.id,
    query,
  });
};
