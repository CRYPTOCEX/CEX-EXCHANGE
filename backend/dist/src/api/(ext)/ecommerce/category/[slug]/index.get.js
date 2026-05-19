"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a specific ecommerce category by slug",
    description: "Fetches a single ecommerce category by its slug, including all active products in that category with calculated ratings and review counts.",
    operationId: "getEcommerceCategoryBySlug",
    tags: ["Ecommerce", "Categories"],
    logModule: "ECOM",
    logTitle: "Get Category",
    parameters: [
        {
            index: 0,
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string", description: "Category slug" },
        },
    ],
    responses: {
        200: {
            description: "Ecommerce category retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseCategorySchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Category"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Category");
    const category = await db_1.models.ecommerceCategory.findOne({
        where: { slug: params.slug, status: true },
        include: [
            {
                model: db_1.models.ecommerceProduct,
                as: "ecommerceProducts",
                where: { status: true },
                attributes: [
                    "id",
                    "name",
                    "slug",
                    "description",
                    "shortDescription",
                    "type",
                    "price",
                    "status",
                    "image",
                    "currency",
                    "inventoryQuantity",
                    "createdAt",
                ],
                include: [
                    {
                        model: db_1.models.ecommerceReview,
                        as: "ecommerceReviews",
                        attributes: [
                            "id",
                            "productId",
                            "userId",
                            "rating",
                            "status",
                            "createdAt",
                        ],
                    },
                ],
                order: [["name", "ASC"]],
            },
        ],
    });
    if (!category) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Category not found" });
    }
    const categoryData = category.toJSON();
    const { ecommerceProducts, ...rest } = categoryData;
    try {
        const processedCategory = {
            ...rest,
            products: ecommerceProducts === null || ecommerceProducts === void 0 ? void 0 : ecommerceProducts.map((product) => {
                var _a, _b, _c;
                return ({
                    ...product,
                    rating: ((_a = product.ecommerceReviews) === null || _a === void 0 ? void 0 : _a.length)
                        ? product.ecommerceReviews.reduce((acc, review) => acc + review.rating, 0) / product.ecommerceReviews.length
                        : 0,
                    reviewsCount: (_c = (_b = product.ecommerceReviews) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0,
                });
            }),
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Category fetched successfully");
        return JSON.parse(JSON.stringify(processedCategory));
    }
    catch (error) {
        console.error("Error fetching category:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Error fetching category data",
        });
    }
};
