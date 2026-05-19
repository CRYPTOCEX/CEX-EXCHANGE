"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Removes a product from the user's wishlist",
    description: "Allows a user to remove a product from their wishlist.",
    operationId: "removeFromEcommerceWishlist",
    tags: ["Ecommerce", "Wishlist"],
    logModule: "ECOM",
    logTitle: "Remove from wishlist",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: {
                type: "string",
                description: "Product ID to be removed from the wishlist",
            },
        },
    ],
    responses: (0, query_1.deleteRecordResponses)("Wishlist"),
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding user wishlist");
    const wishlist = await db_1.models.ecommerceWishlist.findOne({
        where: { userId: user.id },
    });
    if (!wishlist) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Wishlist not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Wishlist not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Removing product from wishlist");
    const result = await db_1.models.ecommerceWishlistItem.destroy({
        where: { wishlistId: wishlist.id, productId: id },
        force: true,
    });
    if (!result) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Product not found in wishlist");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Product not found in wishlist",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking if wishlist is empty");
    const remainingItems = await db_1.models.ecommerceWishlistItem.findAll({
        where: { wishlistId: wishlist.id },
    });
    if (remainingItems.length === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Removing empty wishlist");
        await db_1.models.ecommerceWishlist.destroy({
            where: { id: wishlist.id },
            force: true,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Product ${id} removed from wishlist`);
    return { message: "Product removed from wishlist successfully" };
};
