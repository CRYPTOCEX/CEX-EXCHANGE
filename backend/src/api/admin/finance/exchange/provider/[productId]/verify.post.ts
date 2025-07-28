import ExchangeManager from "@b/utils/exchange";
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Verify Exchange Credentials",
  operationId: "verifyExchangeCredentials",
  tags: ["Admin", "Exchange", "Credentials"],
  description: "Verifies the API credentials for the exchange provider.",
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      in: "path",
      name: "productId",
      description: "Product ID of the exchange to verify credentials for",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Credentials verification result",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: {
                type: "boolean",
                description: "Whether the credentials are valid",
              },
              message: {
                type: "string",
                description: "Verification result message",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange"),
    500: serverErrorResponse,
  },
  permission: "edit.exchange",
};

export default async (data: Handler) => {
  const { params } = data;
  const { productId } = params;

  if (!productId) {
    throw new Error("Product ID is required for credentials verification.");
  }

  // Find the exchange by productId
  const exchange = await models.exchange.findOne({
    where: { productId },
  });

  if (!exchange) {
    throw new Error("Exchange not found");
  }

  // Test the exchange credentials
  const result = await ExchangeManager.testExchangeCredentials(exchange.name);
  
  return result;
};
