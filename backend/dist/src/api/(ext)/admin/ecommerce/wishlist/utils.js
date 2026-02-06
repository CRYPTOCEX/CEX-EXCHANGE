"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wishlistUpdateSchema = exports.baseEcommerceWishlistSchema = exports.ecommerceWishlistSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the e-commerce wishlist entry");
const userId = (0, schema_1.baseStringSchema)("User ID associated with the wishlist entry", 36);
const productId = (0, schema_1.baseStringSchema)("Product ID associated with the wishlist entry", 36);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the wishlist entry", true);
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the wishlist entry", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the wishlist entry", true);
exports.ecommerceWishlistSchema = {
    id,
    userId,
    productId,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseEcommerceWishlistSchema = {
    id,
    userId,
    productId,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.wishlistUpdateSchema = {
    type: "object",
    properties: {
        userId,
        productId,
    },
    required: ["userId", "productId"],
};
