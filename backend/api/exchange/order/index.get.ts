import ExchangeManager from "@b/utils/exchange";
// /server/api/exchange/orders/index.get.ts

import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseOrderSchema } from "./utils";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "List Orders",
  operationId: "listOrders",
  tags: ["Exchange", "Orders"],
  description: "Retrieves a list of orders for the authenticated user.",
  parameters: [
    {
      name: "type",
      in: "query",
      description: "Type of order to retrieve.",
      schema: { type: "string" },
    },
    {
      name: "currency",
      in: "query",
      description: "currency of the order to retrieve.",
      schema: { type: "string" },
    },
    {
      name: "pair",
      in: "query",
      description: "pair of the order to retrieve.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "A list of orders",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseOrderSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Order"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw new Error("Unauthorized");
  const { currency, pair, type } = data.query;

  const orders = await models.exchangeOrder.findAll({
    where: {
      userId: user.id,
      status: type === "OPEN" ? "OPEN" : { [Op.not]: "OPEN" },
      symbol: `${currency}/${pair}`,
    },
  });

  return orders;
};
