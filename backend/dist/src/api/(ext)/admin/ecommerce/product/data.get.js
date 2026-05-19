"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const constants_1 = require("@b/utils/constants");
const db_1 = require("@b/db");
const currency_1 = require("@b/utils/currency");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Get form structure data for ecommerce products",
    operationId: "getEcommerceProductStructureData",
    tags: ["Admin", "Ecommerce", "Product"],
    description: "Retrieves form structure data including available categories, wallet types, and currency conditions for creating or editing ecommerce products",
    responses: {
        200: {
            description: "Form structure data retrieved successfully",
            content: constants_1.structureSchema,
        },
    },
    requiresAuth: true,
    permission: "view.ecommerce.product",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching product form structure data");
    const categoriesRes = await db_1.models.ecommerceCategory.findAll();
    const categories = categoriesRes.map((category) => ({
        value: category.id,
        label: category.name,
    }));
    const walletTypes = [
        { value: "FIAT", label: "Fiat" },
        { value: "SPOT", label: "Spot" },
    ];
    const currencyConditions = await (0, currency_1.getCurrencyConditions)();
    const cacheManager = cache_1.CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    if (extensions.has("ecosystem")) {
        walletTypes.push({ value: "ECO", label: "Funding" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved product data successfully");
    return {
        categories,
        walletTypes,
        currencyConditions,
    };
};
