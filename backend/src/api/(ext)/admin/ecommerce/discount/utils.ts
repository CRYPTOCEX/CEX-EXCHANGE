import {
  baseStringSchema,
  baseNumberSchema,
  baseDateTimeSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the e-commerce discount");
const code = baseStringSchema("Discount code", 191);
const percentage = baseNumberSchema("Discount percentage", false);
const validUntil = baseDateTimeSchema("Validity date of the discount", false);
const productId = baseStringSchema("Associated product ID");
const status = baseBooleanSchema("Status of the discount");

export const ecommerceDiscountSchema = {
  id,
  code,
  percentage,
  validUntil,
  productId,
  status,
};

export const baseEcommerceDiscountSchema = {
  id,
  code,
  percentage,
  validUntil,
  productId,
  status,
};

export const discountUpdateSchema = {
  type: "object",
  properties: {
    code,
    percentage,
    validUntil,
    productId,
    status,
  },
  required: ["code", "percentage", "validUntil", "productId", "status"],
};

export const discountStoreSchema = {
  description: `Discount created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseEcommerceDiscountSchema,
      },
    },
  },
};
