import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { discountUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce discount",
  operationId: "updateEcommerceDiscount",
  tags: ["Admin", "Ecommerce", "Discounts"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce discount to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the ecommerce discount",
    content: {
      "application/json": {
        schema: discountUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Discount"),
  requiresAuth: true,
  permission: "edit.ecommerce.discount",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { code, percentage, validUntil, productId, status } = body;

  return await updateRecord("ecommerceDiscount", id, {
    code,
    percentage,
    validUntil,
    productId,
    status,
  });
};
