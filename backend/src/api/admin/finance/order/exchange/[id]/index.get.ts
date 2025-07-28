// /server/api/admin/exchange/orders/[id].get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { orderSchema } from "../utils"; // Ensure the schema is adjusted to include only the fields needed.
import { models } from "@b/db";

export const metadata = {
  summary: "Retrieves detailed information of a specific exchange order by ID",
  operationId: "getExchangeOrderById",
  tags: ["Admin", "Exchange Order"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the exchange order to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Exchange order details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: orderSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange Order"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.exchange.order",
};

export default async (data: Handler) => {
  const { params } = data;

  const exclude = [
    "referenceId",
    "status",
    "symbol",
    "type",
    "timeInForce",
    "side",
    "price",
    "amount",
    "fee",
    "feeCurrency",
  ];

  return await getRecord("exchangeOrder", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
  ]);
};
