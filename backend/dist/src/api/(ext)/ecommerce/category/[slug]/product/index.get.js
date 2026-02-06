"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../../utils");
exports.metadata = {
    summary: "Get products by category slug",
    description: "Retrieves all active products within a specific category identified by its slug.",
    operationId: "getProductsByCategorySlug",
    tags: ["Ecommerce", "Categories", "Products"],
    logModule: "ECOM",
    logTitle: "Get Category Products",
    parameters: [
        {
            index: 0,
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Category slug",
        },
    ],
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
                                reviewsCount: { type: "number", description: "Number of reviews" },
                            },
                        },
                    },
                },
            },
        },
        404: (0, query_1.notFoundMetadataResponse)("Category"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Category Products");
    const { slug } = params;
    try {
        const category = await db_1.models.ecommerceCategory.findOne({
            where: { slug, status: true },
            attributes: ["id", "name", "slug"],
        });
        if (!category) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Category not found" });
        }
        const products = await db_1.models.ecommerceProduct.findAll({
            where: {
                categoryId: category.get("id"),
                status: true,
            },
            include: [
                {
                    model: db_1.models.ecommerceCategory,
                    as: "category",
                    attributes: ["id", "name", "slug"],
                },
                {
                    model: db_1.models.ecommerceReview,
                    as: "ecommerceReviews",
                    attributes: ["id", "rating", "status"],
                    where: { status: "APPROVED" },
                    required: false,
                },
            ],
            order: [["createdAt", "DESC"]],
        });
        if (!products || products.length === 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("No products found in category");
            return [];
        }
        const processedProducts = products.map((product) => {
            const productData = product.toJSON();
            const reviews = productData.ecommerceReviews || [];
            const rating = reviews.length > 0
                ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                : 0;
            return {
                ...productData,
                rating: Math.round(rating * 10) / 10,
                reviewsCount: reviews.length,
            };
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${processedProducts.length} products from category`);
        return processedProducts;
    }
    catch (error) {
        console.error("Error fetching category products:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Error fetching category products",
        });
    }
};
