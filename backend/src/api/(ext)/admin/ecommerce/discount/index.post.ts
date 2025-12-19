// /api/admin/ecommerce/discounts/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { discountStoreSchema, discountUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new ecommerce discount",
  operationId: "createEcommerceDiscount",
  description:
    "Creates a new ecommerce discount code with specified percentage, validity period, and product association. The discount code must be unique and the percentage must be between 0 and 100. The validity date must be in the future.",
  tags: ["Admin", "Ecommerce", "Discount"],
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
  logModule: "ADMIN_ECOM",
  logTitle: "Create discount",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { code, percentage, validUntil, productId, status } = body;

  ctx?.step("Validating discount data");
  ctx?.step("Creating discount record");

  const result = await storeRecord({
    model: "ecommerceDiscount",
    data: {
      code,
      percentage,
      validUntil,
      productId,
      status,
    },
  });

  ctx?.success(`Discount created: ${code}`);
  return result;
};
