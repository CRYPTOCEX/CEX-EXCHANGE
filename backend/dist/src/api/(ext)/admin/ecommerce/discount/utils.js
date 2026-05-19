"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discountStoreSchema = exports.discountUpdateSchema = exports.baseEcommerceDiscountSchema = exports.ecommerceDiscountSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the e-commerce discount");
const code = (0, schema_1.baseStringSchema)("Discount code", 191);
const percentage = (0, schema_1.baseNumberSchema)("Discount percentage", false);
const validUntil = (0, schema_1.baseDateTimeSchema)("Validity date of the discount", false);
const productId = (0, schema_1.baseStringSchema)("Associated product ID");
const status = (0, schema_1.baseBooleanSchema)("Status of the discount");
exports.ecommerceDiscountSchema = {
    id,
    code,
    percentage,
    validUntil,
    productId,
    status,
};
exports.baseEcommerceDiscountSchema = {
    id,
    code,
    percentage,
    validUntil,
    productId,
    status,
};
exports.discountUpdateSchema = {
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
exports.discountStoreSchema = {
    description: `Discount created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseEcommerceDiscountSchema,
            },
        },
    },
};
