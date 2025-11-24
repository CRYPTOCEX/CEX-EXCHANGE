import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseOrderSchema } from "../../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific order by ID",
  description:
    "Fetches a single order by its ID, including details of the products in the order.",
  operationId: "getEcommerceOrderById",
  tags: ["Ecommerce", "Orders"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Order ID" },
    },
  ],
  responses: {
    200: {
      description: "Order retrieved successfully",
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
    404: notFoundMetadataResponse("Ecommerce Order"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const order = (await models.ecommerceOrder.findOne({
    where: { id: params.id, userId: user.id },
    include: [
      {
        model: models.ecommerceProduct,
        as: "products",
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
    throw createError({ statusCode: 404, message: "Order not found" });
  }

  return order.get({ plain: true });
};
