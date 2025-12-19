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
  logModule: "ADMIN_ECOM",
  logTitle: "Create E-commerce Shipping",
};

export default async (data: Handler) => {
  const { body, ctx } = data;

  ctx?.step("Creating E-commerce shipping record");
  const result = await storeRecord({
    model: "ecommerceShipping",
    data: body,
  });

  ctx?.success("Successfully created E-commerce shipping record");
  return result;
}; 