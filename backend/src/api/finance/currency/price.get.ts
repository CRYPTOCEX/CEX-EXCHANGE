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
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Get price in USD for a currency",
  description: "Returns the price in USD for a given currency and wallet type.",
  operationId: "getCurrencyPriceInUSD",
  tags: ["Finance", "Currency"],
  logModule: "FINANCE",
  logTitle: "Get currency price in USD",
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
  const { user, query, ctx } = data;

  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError(401, "Unauthorized");
  }

  const { currency, type } = query;

  ctx?.step("Validating price query parameters");
  if (!currency || !type) {
    logger.error("CURRENCY", "Missing required parameters for price lookup", { currency, type });
    ctx?.fail("Missing required query parameters");
    throw createError(400, "Missing required query parameters");
  }

  let priceUSD: number;
  try {
    ctx?.step(`Fetching price for ${currency} (${type})`);
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
        logger.error("CURRENCY", `Invalid wallet type for price lookup: ${type}`);
        ctx?.fail(`Invalid wallet type: ${type}`);
        throw createError(400, `Invalid type: ${type}`);
    }

    ctx?.step("Validating price data");
    if (priceUSD === null || priceUSD === undefined || isNaN(priceUSD)) {
      logger.error("CURRENCY", `Invalid price returned for ${currency} (${type})`, {
        currency,
        type,
        priceUSD,
        priceType: typeof priceUSD
      });
      ctx?.fail(`Price not found for ${currency} (${type})`);
      throw createError(404, `Price not found for ${currency} (${type})`);
    }

    // Warn if price is 0 (valid but unusual - might indicate no trading activity)
    if (priceUSD === 0) {
      logger.warn("CURRENCY", `Price is 0 for ${currency} (${type}) - no trading activity or unlisted token`);
      ctx?.warn(`Price is 0 for ${currency} (${type})`);
    }

    ctx?.success(`Retrieved price for ${currency} (${type}): $${priceUSD}`);
    return {
      status: true,
      message: "Price in USD retrieved successfully",
      data: priceUSD,
    };
  } catch (error: any) {
    logger.error("CURRENCY", `Error fetching price for ${currency} (${type})`, error);
    if (!error.statusCode) {
      ctx?.fail(`Error fetching price for ${currency} (${type})`);
    }
    throw error;
  }
};
