"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Creates a new ecommerce discount",
    operationId: "createEcommerceDiscount",
    description: "Creates a new ecommerce discount code with specified percentage, validity period, and product association. The discount code must be unique and the percentage must be between 0 and 100. The validity date must be in the future.",
    tags: ["Admin", "Ecommerce", "Discount"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.discountUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.discountStoreSchema, "E-commerce Discount"),
    requiresAuth: true,
    permission: "create.ecommerce.discount",
    logModule: "ADMIN_ECOM",
    logTitle: "Create discount",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { code, percentage, validUntil, productId, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating discount data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating discount record");
    const result = await (0, query_1.storeRecord)({
        model: "ecommerceDiscount",
        data: {
            code,
            percentage,
            validUntil,
            productId,
            status,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Discount created: ${code}`);
    return result;
};
