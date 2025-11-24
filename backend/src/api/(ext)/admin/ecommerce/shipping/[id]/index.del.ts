// /server/api/ecommerce/Shipping/delete.del.ts

import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific e-commerce shipping",
  operationId: "deleteEcommerceShipping",
  tags: ["Admin", "Ecommerce", "Shipping"],
  parameters: deleteRecordParams("E-commerce shipping"),
  responses: deleteRecordResponses("E-commerce shipping"),
  permission: "delete.ecommerce.shipping",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "ecommerceShipping",
    id: params.id,
    query,
  });
};
