"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves all ecommerce products",
    description: "Fetches a list of all active ecommerce products, including their categories and aggregated review stats.",
    operationId: "getEcommerceProducts",
    tags: ["Ecommerce", "Products"],
    logModule: "ECOM",
    logTitle: "Get Products",
    responses: {
        200: {
            description: "Products retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ...utils_1.baseProductSchema,
                                rating: { type: "number", description: "Average rating" },
                                reviewsCount: {
                                    type: "number",
                                    description: "Number of reviews",
                                },
                            },
                            required: ["id", "name", "slug"],
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Products");
    try {
        const products = await db_1.models.ecommerceProduct.findAll({
            where: { status: true },
            include: [
                {
                    model: db_1.models.ecommerceCategory,
                    as: "category",
                    attributes: ["id", "name", "slug"],
                },
                {
                    model: db_1.models.ecommerceReview,
                    as: "ecommerceReviews",
                    attributes: ["id", "rating", "userId", "status", "createdAt"],
                    required: false,
                },
            ],
            order: [["createdAt", "DESC"]],
        });
        if (!products || products.length === 0) {
            return [];
        }
        const productsData = products.map((product) => {
            const json = product.toJSON();
            const reviews = json.ecommerceReviews || [];
            const rating = reviews.length > 0
                ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
                    reviews.length
                : 0;
            return {
                ...json,
                rating,
                reviewsCount: reviews.length,
            };
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Products fetched successfully");
        return JSON.parse(JSON.stringify(productsData));
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error retrieving products: ${error.message}`,
        });
    }
};
