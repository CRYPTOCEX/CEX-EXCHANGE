import ExchangeManager from "@b/utils/exchange";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseExchangeSchema } from "../utils";
import { models } from "@b/db";

export const metadata = {
  summary: "Retrieves detailed information of a specific exchange by ID",
  operationId: "getExchangeById",
  tags: ["Admin", "Exchanges"],
  parameters: [
    {
      index: 0,
      name: "productId",
      in: "path",
      required: true,
      description: "ID of the exchange to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Exchange details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseExchangeSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange"),
    500: serverErrorResponse,
  },
  permission: "view.exchange",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;
  const { productId } = params;
  const exchange = await models.exchange.findOne({
    where: { productId },
  });

  if (!exchange) {
    return data.response.notFound("Exchange not found");
  }

  const result = await ExchangeManager.testExchangeCredentials(exchange.name);

  return {
    exchange,
    result,
  };
};
