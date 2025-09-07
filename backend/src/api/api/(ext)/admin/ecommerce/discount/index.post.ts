// /api/admin/ecommerce/discounts/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { discountStoreSchema, discountUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new E-commerce Discount",
  operationId: "storeEcommerceDiscount",
  tags: ["Admin", "Ecommerce Discounts"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: discountUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(discountStoreSchema, "E-commerce Discount"),
  requiresAuth: true,
  permission: "create.ecommerce.discount",
};

export default async (data: Handler) => {
  const { body } = data;
  const { code, percentage, validUntil, productId, status } = body;

  return await storeRecord({
    model: "ecommerceDiscount",
    data: {
      code,
      percentage,
      validUntil,
      productId,
      status,
    },
  });
};
