import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the e-commerce review");
const productId = baseStringSchema("Product ID associated with the review");
const userId = baseStringSchema("User ID who wrote the review");
const rating = baseNumberSchema("Rating given in the review");
const comment = baseStringSchema("Comment made in the review", 191, 0, true);
const status = baseBooleanSchema("Status of the review");

export const ecommerceReviewSchema = {
  id,
  productId,
  userId,
  rating,
  comment,
  status,
};

export const baseEcommerceReviewSchema = {
  id,
  productId,
  userId,
  rating,
  comment,
  status,
};

export const reviewUpdateSchema = {
  type: "object",
  properties: {
    rating,
    comment,
    status,
  },
  required: ["rating", "status"],
};
