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
  logModule: "FINANCE",
  logTitle: "Get currency exchange rate",
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
  const { user, query, ctx } = data;

  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError(401, "Unauthorized");
  }

  const { fromCurrency, fromType, toCurrency, toType } = query;

  ctx?.step("Validating exchange rate parameters");
  if (!fromCurrency || !fromType || !toCurrency || !toType) {
    ctx?.fail("Missing required query parameters");
    throw createError(400, "Missing required query parameters");
  }

  // If currencies and types are the same, rate is 1
  if (fromCurrency === toCurrency && fromType === toType) {
    ctx?.success(`Exchange rate for ${fromCurrency} to ${toCurrency} (same currency): 1`);
    return {
      status: true,
      message: "Exchange rate retrieved successfully",
      data: 1,
    };
  }

  ctx?.step(`Fetching USD price for ${fromCurrency} (${fromType})`);
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
      ctx?.fail(`Invalid source wallet type: ${fromType}`);
      throw createError(400, `Invalid fromType: ${fromType}`);
  }

  ctx?.step(`Fetching USD price for ${toCurrency} (${toType})`);
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
      ctx?.fail(`Invalid target wallet type: ${toType}`);
      throw createError(400, `Invalid toType: ${toType}`);
  }

  ctx?.step("Calculating exchange rate");
  const rate = toPriceUSD / fromPriceUSD;

  ctx?.success(`Exchange rate calculated: ${fromCurrency} to ${toCurrency} = ${rate}`);
  return rate;
};
