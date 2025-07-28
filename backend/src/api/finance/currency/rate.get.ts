// /server/api/finance/currency/rate.get.ts
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
  summary: "Get exchange rate between two currencies",
  description:
    "Returns the exchange rate between two currencies given their wallet types.",
  operationId: "getExchangeRate",
  tags: ["Finance", "Currency"],
  parameters: [
    {
      name: "fromCurrency",
      in: "query",
      description: "The currency to convert from",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "fromType",
      in: "query",
      description: "The wallet type of the currency to convert from",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "toCurrency",
      in: "query",
      description: "The currency to convert to",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "toType",
      in: "query",
      description: "The wallet type of the currency to convert to",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requiresAuth: true,
  responses: {
    200: {
      description: "Exchange rate retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseResponseSchema,
              data: {
                type: "number",
                description: "Exchange rate from fromCurrency to toCurrency",
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

  const { fromCurrency, fromType, toCurrency, toType } = query;

  if (!fromCurrency || !fromType || !toCurrency || !toType) {
    throw createError(400, "Missing required query parameters");
  }

  // If currencies and types are the same, rate is 1
  if (fromCurrency === toCurrency && fromType === toType) {
    return {
      status: true,
      message: "Exchange rate retrieved successfully",
      data: 1,
    };
  }

  // Get price in USD for fromCurrency
  let fromPriceUSD;
  switch (fromType) {
    case "FIAT":
      fromPriceUSD = await getFiatPriceInUSD(fromCurrency);
      break;
    case "SPOT":
      fromPriceUSD = await getSpotPriceInUSD(fromCurrency);
      break;
    case "ECO":
      fromPriceUSD = await getEcoPriceInUSD(fromCurrency);
      break;
    default:
      throw createError(400, `Invalid fromType: ${fromType}`);
  }

  // Get price in USD for toCurrency
  let toPriceUSD;
  switch (toType) {
    case "FIAT":
      toPriceUSD = await getFiatPriceInUSD(toCurrency);
      break;
    case "SPOT":
      toPriceUSD = await getSpotPriceInUSD(toCurrency);
      break;
    case "ECO":
      toPriceUSD = await getEcoPriceInUSD(toCurrency);
      break;
    default:
      throw createError(400, `Invalid toType: ${toType}`);
  }

  // Calculate exchange rate: rate = toPriceUSD / fromPriceUSD
  const rate = toPriceUSD / fromPriceUSD;

  return rate;
};
