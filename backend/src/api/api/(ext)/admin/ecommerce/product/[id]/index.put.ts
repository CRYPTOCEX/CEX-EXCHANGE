import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecommerceProductUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce product",
  operationId: "updateEcommerceProduct",
  tags: ["Admin", "Ecommerce", "Products"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce product to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the ecommerce product",
    content: {
      "application/json": {
        schema: ecommerceProductUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Product"),
  requiresAuth: true,
  permission: "edit.ecommerce.product",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const {
    name,
    description,
    shortDescription,
    type,
    price,
    status,
    image,
    currency,
    walletType,
    inventoryQuantity,
  } = body;

  return await updateRecord("ecommerceProduct", id, {
    name,
    description,
    shortDescription,
    type,
    price,
    status,
    image,
    currency,
    walletType,
    inventoryQuantity,
  });
};
