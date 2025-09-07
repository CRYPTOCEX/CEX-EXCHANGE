import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific e-commerce discount",
  operationId: "deleteEcommerceDiscount",
  tags: ["Admin", "Ecommerce", "Discounts"],
  parameters: deleteRecordParams("E-commerce discount"),
  responses: deleteRecordResponses("E-commerce discount"),
  permission: "delete.ecommerce.discount",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "ecommerceDiscount",
    id: params.id,
    query,
  });
};
