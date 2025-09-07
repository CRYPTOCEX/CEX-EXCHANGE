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
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;

  return await updateRecord("ecommerceShipping", id, {
    ...body,
  });
};
