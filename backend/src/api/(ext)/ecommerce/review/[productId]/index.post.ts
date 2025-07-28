import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Creates or updates a review for a product",
  description:
    "Allows a user to submit a review for a product they have purchased. Users can only review products once, but they can update their review.",
  operationId: "createEcommerceReview",
  tags: ["Ecommerce", "Reviews"],
  parameters: [
    {
      index: 0,
      name: "productId",
      in: "path",
      required: true,
      schema: { type: "string", description: "Product ID for the review" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            rating: {
              type: "number",
              description: "Rating given to the product",
            },
            comment: {
              type: "string",
              description: "Comment about the product",
              nullable: true,
            },
          },
          required: ["rating"],
        },
      },
    },
  },
  responses: createRecordResponses("Review"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, params, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { productId } = params;
  const { rating, comment } = body;

  // Check if the user has purchased the product
  const userHasPurchased = await models.ecommerceOrder.findOne({
    where: {
      userId: user.id,
      status: "COMPLETED",
    },
    include: [
      {
        model: models.ecommerceProduct,
        as: "products",
        through: {
          attributes: [],
        },
        where: {
          id: productId,
        },
      },
    ],
  });

  if (!userHasPurchased) {
    throw createError({
      statusCode: 400,
      message: "You have not purchased this product",
    });
  }

  // Execute upsert transaction
  const result = await sequelize.transaction(async (transaction) => {
    const [review, created] = await models.ecommerceReview.upsert(
      {
        productId: productId,
        userId: user.id,
        rating,
        comment,
      },
      {
        returning: true,
        transaction,
      }
    );

    return {
      review,
      created,
    };
  });

  return {
    message: `Review successfully ${result.created ? "created" : "updated"}.`,
  };
};
