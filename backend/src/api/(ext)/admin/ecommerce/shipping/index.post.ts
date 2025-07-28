import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  ecommerceShippingStoreSchema,
  ecommerceShippingUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new E-commerce Shipping",
  operationId: "storeEcommerceShipping",
  tags: ["Admin", "Ecommerce Shipping"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecommerceShippingUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    ecommerceShippingStoreSchema,
    "E-commerce Shipping"
  ),
  requiresAuth: true,
  permission: "create.ecommerce.shipping",
};

export default async (data: Handler) => {
  const { body } = data;

  return await storeRecord({
    model: "ecommerceShipping",
    data: body,
  });
}; 