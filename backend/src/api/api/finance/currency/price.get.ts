import { createError } from "@b/utils/error";
import {
  baseResponseSchema,
  getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "./utils";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Get price in USD for a currency",
  description: "Returns the price in USD for a given currency and wallet type.",
  operationId: "getCurrencyPriceInUSD",
  tags: ["Finance", "Currency"],
  parameters: [
    {
      name: "currency",
      in: "query",
      description: "The currency to get the price for",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "type",
      in: "query",
      description: "The wallet type of the currency",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requiresAuth: true,
  responses: {
    200: {
      description: "Price in USD retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseResponseSchema,
              data: {
                type: "number",
                description: "Price of the currency in USD",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Currency"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  const { currency, type } = query;
  if (!currency || !type) {
    throw createError(400, "Missing required query parameters");
  }

  let priceUSD;
  switch (type) {
    case "FIAT":
      priceUSD = await getFiatPriceInUSD(currency);
      break;
    case "SPOT":
      priceUSD = await getSpotPriceInUSD(currency);
      break;
    case "ECO":
      priceUSD = await getEcoPriceInUSD(currency);
      break;
    default:
      throw createError(400, `Invalid type: ${type}`);
  }

  return {
    status: true,
    message: "Price in USD retrieved successfully",
    data: priceUSD,
  };
};
