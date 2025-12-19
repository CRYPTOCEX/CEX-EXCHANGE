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
  logModule: "ADMIN_ECOM",
  logTitle: "Delete E-commerce Shipping",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting E-commerce shipping record");
  const result = await handleSingleDelete({
    model: "ecommerceShipping",
    id: params.id,
    query,
  });

  ctx?.success("Successfully deleted E-commerce shipping record");
  return result;
};
