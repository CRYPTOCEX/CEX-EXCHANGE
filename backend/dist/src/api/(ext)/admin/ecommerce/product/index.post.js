"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Creates a new ecommerce product",
    operationId: "createEcommerceProduct",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Creates a new ecommerce product with the provided details. Validates category existence and status, checks for duplicate product names, and automatically generates a unique slug from the product name.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.ecommerceProductUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.ecommerceProductStoreSchema, "Ecommerce Product"),
    requiresAuth: true,
    permission: "create.ecommerce.product",
    logModule: "ADMIN_ECOM",
    logTitle: "Create Ecommerce Product",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, description, shortDescription, type, price, categoryId, inventoryQuantity, filePath, status, image, currency, walletType, } = body;
    if (!categoryId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Category ID is required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category");
    const category = await db_1.models.ecommerceCategory.findOne({
        where: { id: categoryId, status: true },
    });
    if (!category) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid category ID or category is inactive",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate product");
    const existingProduct = await db_1.models.ecommerceProduct.findOne({
        where: { name },
    });
    if (existingProduct) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Product with this name already exists",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating E-commerce product");
    const result = await (0, query_1.storeRecord)({
        model: "ecommerceProduct",
        data: {
            name,
            description,
            shortDescription,
            type,
            price,
            categoryId,
            inventoryQuantity,
            filePath,
            status,
            image,
            currency,
            walletType,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully created E-commerce product");
    return result;
};
