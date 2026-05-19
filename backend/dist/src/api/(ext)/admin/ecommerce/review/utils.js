"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewUpdateSchema = exports.baseEcommerceReviewSchema = exports.ecommerceReviewSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the e-commerce review");
const productId = (0, schema_1.baseStringSchema)("Product ID associated with the review");
const userId = (0, schema_1.baseStringSchema)("User ID who wrote the review");
const rating = (0, schema_1.baseNumberSchema)("Rating given in the review");
const comment = (0, schema_1.baseStringSchema)("Comment made in the review", 191, 0, true);
const status = (0, schema_1.baseBooleanSchema)("Status of the review");
exports.ecommerceReviewSchema = {
    id,
    productId,
    userId,
    rating,
    comment,
    status,
};
exports.baseEcommerceReviewSchema = {
    id,
    productId,
    userId,
    rating,
    comment,
    status,
};
exports.reviewUpdateSchema = {
    type: "object",
    properties: {
        rating,
        comment,
        status,
    },
    required: ["rating", "status"],
};
