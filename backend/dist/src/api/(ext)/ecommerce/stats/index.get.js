"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieves ecommerce statistics",
    description: "Fetches statistics for the ecommerce platform including product count, category count, and order count.",
    operationId: "getEcommerceStats",
    tags: ["Ecommerce", "Stats"],
    logModule: "ECOM",
    logTitle: "Get Stats",
    responses: {
        200: {
            description: "Stats retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            products: {
                                type: "number",
                                description: "Total number of active products",
                            },
                            categories: {
                                type: "number",
                                description: "Total number of active categories",
                            },
                            orders: {
                                type: "number",
                                description: "Total number of orders",
                            },
                        },
                        required: ["products", "categories", "orders"],
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Ecommerce Stats");
    try {
        const [productsCount, categoriesCount, ordersCount] = await Promise.all([
            db_1.models.ecommerceProduct.count({
                where: { status: true },
            }),
            db_1.models.ecommerceCategory.count({
                where: { status: true },
            }),
            db_1.models.ecommerceOrder.count(),
        ]);
        const stats = {
            products: productsCount,
            categories: categoriesCount,
            orders: ordersCount,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Stats fetched successfully");
        return stats;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error retrieving stats: ${error.message}`,
        });
    }
};
