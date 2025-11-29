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
    console.error("[Currency Price API] Missing required parameters:", { currency, type });
    throw createError(400, "Missing required query parameters");
  }

  let priceUSD: number;
  try {
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
        console.error(`[Currency Price API] Invalid type:`, type);
        throw createError(400, `Invalid type: ${type}`);
    }

    if (priceUSD === null || priceUSD === undefined || isNaN(priceUSD)) {
      console.error(`[Currency Price API] Invalid price returned:`, {
        currency,
        type,
        priceUSD,
        priceType: typeof priceUSD
      });
      throw createError(404, `Price not found for ${currency} (${type})`);
    }

    // Warn if price is 0 (valid but unusual - might indicate no trading activity)
    if (priceUSD === 0) {
      console.warn(`[Currency Price API] Price is 0 for ${currency} (${type}) - no trading activity or unlisted token`);
    }

    return {
      status: true,
      message: "Price in USD retrieved successfully",
      data: priceUSD,
    };
  } catch (error: any) {
    console.error(`[Currency Price API] Error fetching price:`, {
      currency,
      type,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};
