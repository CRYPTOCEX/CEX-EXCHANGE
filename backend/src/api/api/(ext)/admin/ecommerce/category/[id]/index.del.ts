import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific e-commerce category",
  operationId: "deleteEcommerceCategory",
  tags: ["Admin", "Ecommerce", "Categories"],
  parameters: deleteRecordParams("E-commerce category"),
  responses: deleteRecordResponses("E-commerce category"),
  permission: "delete.ecommerce.category",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "ecommerceCategory",
    id: params.id,
    query,
  });
};
