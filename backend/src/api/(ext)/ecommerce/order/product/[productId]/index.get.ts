import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseOrderSchema } from "../../../utils";

export const metadata: OperationObject = {
  summary: "Checks if user purchased a specific product",
  description:
    "Fetches an order containing the given productId for the authenticated user, to verify purchase.",
  operationId: "getEcommerceOrderByProductId",
  tags: ["Ecommerce", "Orders"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "productId",
      in: "path",
      required: true,
      schema: { type: "string", description: "Product ID" },
    },
  ],
  responses: {
    200: {
      description: "Order containing the product retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseOrderSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Order for Product"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const order = (await models.ecommerceOrder.findOne({
    where: { userId: user.id },
    include: [
      {
        model: models.ecommerceProduct,
        as: "products",
        where: { id: params.productId },
        through: {
          attributes: ["quantity", "key", "filePath"],
        },
        attributes: [
          "name",
          "price",
          "status",
          "type",
          "image",
          "currency",
          "walletType",
        ],
        include: [
          {
            model: models.ecommerceCategory,
            as: "category",
            attributes: ["name"],
          },
        ],
      },
      {
        model: models.ecommerceShipping,
        as: "shipping",
      },
      {
        model: models.ecommerceShippingAddress,
        as: "shippingAddress",
      },
    ],
  })) as any;
  if (!order) {
    throw createError({
      statusCode: 404,
      message: "Order not found for this product",
    });
  }

  return order.get({ plain: true });
};
