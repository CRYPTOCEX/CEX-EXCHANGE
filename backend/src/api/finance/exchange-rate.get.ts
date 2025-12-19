import { createError } from "@b/utils/error";
import {
  baseObjectSchema,
  baseNumberSchema,
  baseStringSchema,
} from "@b/utils/schema";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import {
  getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "./currency/utils";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Get exchange rate between two currencies",
  description:
    "Calculates the exchange rate between two currencies across different wallet types (FIAT, SPOT, ECO, FUTURES)",
  operationId: "getExchangeRate",
  tags: ["Finance"],
  requiresAuth: true,
  parameters: [
    {
      name: "fromCurrency",
      in: "query",
      description: "Source currency code (e.g., EUR, USD, BTC)",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "fromType",
      in: "query",
      description: "Source wallet type (FIAT, SPOT, ECO, FUTURES)",
      required: true,
      schema: { type: "string", enum: ["FIAT", "SPOT", "ECO", "FUTURES"] },
    },
    {
      name: "toCurrency",
      in: "query",
      description: "Target currency code (e.g., EUR, USD, BTC)",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "toType",
      in: "query",
      description: "Target wallet type (FIAT, SPOT, ECO, FUTURES)",
      required: true,
      schema: { type: "string", enum: ["FIAT", "SPOT", "ECO", "FUTURES"] },
    },
  ],
  responses: {
    200: {
      description: "Exchange rate calculated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              rate: baseNumberSchema("Exchange rate (1 fromCurrency = X toCurrency)"),
              fromPriceUSD: baseNumberSchema("Price of source currency in USD"),
              toPriceUSD: baseNumberSchema("Price of target currency in USD"),
            },
          },
        },
      },
    },
    400: {
      description: "Invalid parameters or currencies",
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Currency"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { fromCurrency, fromType, toCurrency, toType } = query;

  // Validate required parameters
  if (!fromCurrency || !fromType || !toCurrency || !toType) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameters: fromCurrency, fromType, toCurrency, toType",
    });
  }

  // Validate wallet types
  const validTypes = ["FIAT", "SPOT", "ECO", "FUTURES"];
  if (!validTypes.includes(fromType as string) || !validTypes.includes(toType as string)) {
    throw createError({
      statusCode: 400,
      message: "Invalid wallet type. Must be FIAT, SPOT, ECO, or FUTURES",
    });
  }

  try {
    // Get price in USD for source currency
    let fromPriceUSD: number;
    if (fromType === "FIAT") {
      fromPriceUSD = await getFiatPriceInUSD(fromCurrency);
    } else if (fromType === "SPOT" || fromType === "FUTURES") {
      fromPriceUSD = await getSpotPriceInUSD(fromCurrency);
    } else if (fromType === "ECO") {
      fromPriceUSD = await getEcoPriceInUSD(fromCurrency);
    } else {
      throw createError({
        statusCode: 400,
        message: `Unsupported wallet type: ${fromType}`,
      });
    }

    // Get price in USD for target currency
    let toPriceUSD: number;
    if (toType === "FIAT") {
      toPriceUSD = await getFiatPriceInUSD(toCurrency);
    } else if (toType === "SPOT" || toType === "FUTURES") {
      toPriceUSD = await getSpotPriceInUSD(toCurrency);
    } else if (toType === "ECO") {
      toPriceUSD = await getEcoPriceInUSD(toCurrency);
    } else {
      throw createError({
        statusCode: 400,
        message: `Unsupported wallet type: ${toType}`,
      });
    }

    // Validate prices are valid numbers
    if (!fromPriceUSD || isNaN(fromPriceUSD) || fromPriceUSD <= 0) {
      throw createError({
        statusCode: 400,
        message: `Price not available for ${fromCurrency} (${fromType})`,
      });
    }

    if (!toPriceUSD || isNaN(toPriceUSD) || toPriceUSD <= 0) {
      throw createError({
        statusCode: 400,
        message: `Price not available for ${toCurrency} (${toType})`,
      });
    }

    // Calculate exchange rate: 1 fromCurrency = X toCurrency
    // Example: EUR ($1.05) to POL ($0.14) = 1.05 / 0.14 = 7.5 POL per EUR
    const rate = fromPriceUSD / toPriceUSD;

    return {
      rate,
      fromPriceUSD,
      toPriceUSD,
    };
  } catch (error: any) {
    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise wrap it in a generic error
    logger.error("EXCHANGE", "Error calculating exchange rate", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to calculate exchange rate",
    });
  }
};
