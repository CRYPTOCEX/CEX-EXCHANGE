"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Adds a product to the user's wishlist",
    description: "Allows a user to add a product to their wishlist if it's not already included.",
    operationId: "addToEcommerceWishlist",
    tags: ["Ecommerce", "Wishlist"],
    logModule: "ECOM",
    logTitle: "Add product to wishlist",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        productId: {
                            type: "string",
                            description: "Product ID to be added to the wishlist",
                        },
                    },
                    required: ["productId"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Wishlist"),
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { productId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding or creating user wishlist");
    const [wishlist] = await db_1.models.ecommerceWishlist.findOrCreate({
        where: { userId: user.id },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking if product is already in wishlist");
    const existingWishlistItem = await db_1.models.ecommerceWishlistItem.findOne({
        where: { wishlistId: wishlist.id, productId },
    });
    if (existingWishlistItem) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Product already in wishlist");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Product already in wishlist",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding product to wishlist");
    await db_1.models.ecommerceWishlistItem.create({
        wishlistId: wishlist.id,
        productId,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Product ${productId} added to wishlist`);
    return {
        message: "Product added to wishlist successfully",
    };
};
