"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Creates a new ecommerce category",
    description: "Creates a new ecommerce category with the provided name, description, image, and status. The name must be unique across all categories.",
    operationId: "createEcommerceCategory",
    tags: ["Admin", "Ecommerce", "Category"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.ecommerceCategoryUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Category created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.ecommerceCategoryStoreSchema,
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        409: (0, errors_1.conflictResponse)("Ecommerce category"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.ecommerce.category",
    logModule: "ADMIN_ECOM",
    logTitle: "Create category",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, description, image, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating category record");
    const result = await (0, query_1.storeRecord)({
        model: "ecommerceCategory",
        data: {
            name,
            description,
            image,
            status,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Category created: ${name}`);
    return result;
};
