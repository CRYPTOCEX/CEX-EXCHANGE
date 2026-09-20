"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves the user's wishlist",
    description: "Fetches all items in the user's wishlist, including product details, categories, and reviews.",
    operationId: "getEcommerceWishlist",
    tags: ["Ecommerce", "Wishlist"],
    logModule: "ECOM",
    logTitle: "Get Wishlist",
    responses: {
        200: {
            description: "Wishlist retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseWishlistItemSchema,
                            required: ["productId", "product"],
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Ecommerce Wishlist"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Wishlist");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const wishlist = await db_1.models.ecommerceWishlist.findOne({
        where: { userId: user.id },
        include: [
            {
                model: db_1.models.ecommerceProduct,
                as: "products",
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
                    {
                        model: db_1.models.ecommerceCategory,
                        as: "category",
                        attributes: ["slug", "name"],
                    },
                ],
            },
        ],
        order: [
            [{ model: db_1.models.ecommerceProduct, as: "products" }, "name", "ASC"],
        ],
    });
    if (!wishlist) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Wishlist not found" });
    }
    const wishlistData = wishlist.toJSON();
    if (!wishlistData.products || wishlistData.products.length === 0) {
        return [];
    }
    try {
        const products = wishlistData.products.map((product) => {
            var _a, _b, _c;
            return ({
                ...product,
                rating: ((_a = product.ecommerceReviews) === null || _a === void 0 ? void 0 : _a.length)
                    ? product.ecommerceReviews.reduce((acc, review) => acc + review.rating, 0) / product.ecommerceReviews.length
                    : 0,
                reviewsCount: (_c = (_b = product.ecommerceReviews) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0,
            });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Wishlist fetched successfully");
        return JSON.parse(JSON.stringify(products));
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Error processing wishlist data",
        });
    }
};
