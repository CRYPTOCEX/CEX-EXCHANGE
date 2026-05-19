"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves active ecommerce products for selection options",
    description: "Returns a simplified list of active ecommerce products (status: true) formatted for use in dropdowns and selection interfaces. Each product includes ID, name, price, and currency.",
    operationId: "getEcommerceProductOptions",
    tags: ["Admin", "Ecommerce", "Product"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Active ecommerce products retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    description: "Product ID"
                                },
                                name: {
                                    type: "string",
                                    description: "Product name with price and currency (e.g., 'Product Name - 99.99 USD')"
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Products"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching product options");
    try {
        const products = await db_1.models.ecommerceProduct.findAll({
            where: { status: true },
        });
        const formatted = products.map((product) => ({
            id: product.id,
            name: `${product.name} - ${product.price} ${product.currency}`,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${formatted.length} product options`);
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching ecommerce products");
    }
};
