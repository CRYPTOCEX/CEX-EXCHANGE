import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseDiscountSchema } from "../../utils";

export const metadata: OperationObject = {
  summary: "Applies a discount code to a product",
  description:
    "Allows a user to apply a discount code to a product if the discount is active and has not expired.",
  operationId: "applyEcommerceDiscount",
  tags: ["Ecommerce", "Discounts"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "productId",
      in: "path",
      required: true,
      schema: {
        type: "string",
        description: "Product ID to which the discount is applied",
      },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            code: { type: "string", description: "Discount code" },
          },
          required: ["code"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Discount applied successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseDiscountSchema,
            required: ["id", "code", "status"],
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Discount"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { productId } = params;
  const { code } = body;

  const discount = await models.ecommerceDiscount.findOne({
    where: {
      productId: productId,
      code,
      status: true,
      validUntil: {
        [Op.gte]: new Date(),
      },
    },
  });

  if (!discount) {
    throw createError({
      statusCode: 404,
      message: "Discount not found or has expired",
    });
  }

  // Check if user already has this discount applied
  const existingDiscount = await models.ecommerceUserDiscount.findOne({
    where: {
      userId: user.id,
      discountId: discount.id,
    },
  });

  if (existingDiscount && existingDiscount.status) {
    throw createError({
      statusCode: 400,
      message: "Discount already applied and is no longer active",
    });
  }

  if (!existingDiscount) {
    await models.ecommerceUserDiscount.create({
      userId: user.id,
      discountId: discount.id,
      status: false,
    });
  }

  return {
    id: discount.id,
    code: discount.code,
    status: discount.status,
    percentage: discount.percentage,
  };
};
