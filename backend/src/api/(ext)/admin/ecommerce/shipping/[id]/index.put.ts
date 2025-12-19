// /server/api/ecommerce/Shipping/[id].put.ts

import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecommerceShippingUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce shipping",
  operationId: "updateEcommerceShipping",
  tags: ["Admin", "Ecommerce", "Shipping"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce shipping to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the ecommerce shipping",
    content: {
      "application/json": {
        schema: ecommerceShippingUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Shipping"),
  requiresAuth: true,
  permission: "edit.ecommerce.shipping",
  logModule: "ADMIN_ECOM",
  logTitle: "Update E-commerce Shipping",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;

  ctx?.step("Updating E-commerce shipping record");
  const result = await updateRecord("ecommerceShipping", id, {
    ...body,
  });

  ctx?.success("Successfully updated E-commerce shipping record");
  return result;
};
