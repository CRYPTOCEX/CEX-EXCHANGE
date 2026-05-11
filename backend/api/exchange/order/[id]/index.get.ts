// /server/api/exchange/orders/show.get.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseOrderSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Show Order Details",
  operationId: "showOrder",
  tags: ["Exchange", "Orders"],
  description:
    "Retrieves details of a specific order by ID for the authenticated user.",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "ID of the order to retrieve.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Order details",
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
    404: notFoundMetadataResponse("Order"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  if (!data.user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });
  const order = await getOrder(data.params.id);
  if (!order || order.userId !== data.user.id) {
    throw new Error("Order not found or access denied");
  }
  return order;
};

export async function getOrder(id: string): Promise<ExchangeOrder> {
  const response = await models.exchangeOrder.findOne({
    where: {
      id,
    },
  });

  if (!response) {
    throw new Error("Order not found");
  }

  return response.get({ plain: true }) as unknown as ExchangeOrder;
}
