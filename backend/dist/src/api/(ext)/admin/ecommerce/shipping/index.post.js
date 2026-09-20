"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new E-commerce Shipping",
    operationId: "storeEcommerceShipping",
    tags: ["Admin", "Ecommerce Shipping"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.ecommerceShippingUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.ecommerceShippingStoreSchema, "E-commerce Shipping"),
    requiresAuth: true,
    permission: "create.ecommerce.shipping",
    logModule: "ADMIN_ECOM",
    logTitle: "Create E-commerce Shipping",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating E-commerce shipping record");
    const result = await (0, query_1.storeRecord)({
        model: "ecommerceShipping",
        data: body,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully created E-commerce shipping record");
    return result;
};
