"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Retrieves all active ecommerce categories",
    description: "Fetches all active ecommerce categories along with their active products, with calculated ratings and review counts for each product.",
    operationId: "listEcommerceCategories",
    tags: ["Ecommerce", "Categories"],
    logModule: "ECOM",
    logTitle: "Get Categories",
    responses: {
        200: {
            description: "Ecommerce categories retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseCategorySchema,
                        },
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
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Categories");
    const categories = await db_1.models.ecommerceCategory.findAll({
        where: { status: true },
        attributes: [
            "id",
            "name",
            "slug",
            "description",
            "image",
            "status",
            "createdAt",
        ],
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
    if (!categories) {
        throw (0, error_1.createError)({ statusCode: 404, message: "No categories found" });
    }
    if (categories.length === 0) {
        return [];
    }
    try {
        const processedCategories = categories.map((category) => {
            const categoryData = category.toJSON();
            const { ecommerceProducts, ...rest } = categoryData;
            return {
                ...rest,
                products: (ecommerceProducts || []).map((product) => {
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
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Categories fetched successfully");
        return JSON.parse(JSON.stringify(processedCategories));
    }
    catch (error) {
        console.error("Error fetching categories:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Error fetching category data",
        });
    }
};
