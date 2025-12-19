import { storeRecord } from "@b/utils/query";
import {
  FuturesMarketUpdateSchema,
  baseFuturesMarketSchema,
} from "./utils";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Creates a new futures market",
  operationId: "storeFuturesMarket",
  tags: ["Admin", "Futures", "Market"],
  description:
    "Creates a new futures trading market by pairing two active ecosystem tokens. Validates that both tokens exist and are active, and ensures the market pair doesn't already exist.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: FuturesMarketUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Futures market created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseFuturesMarketSchema,
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Currency or Pair Token"),
    409: conflictResponse("Futures Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.futures.market",
  logModule: "ADMIN_FUTURES",
  logTitle: "Create futures market",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { currency, pair, isTrending, isHot, metadata } = body;

  // 1) Find the currency token by ID
  ctx?.step("Validating currency token");
  const currencyToken = await models.ecosystemToken.findOne({
    where: { id: currency, status: true },
  });
  if (!currencyToken) {
    ctx?.fail("Currency token not found or inactive");
    throw createError(404, "Currency token not found or inactive");
  }

  // 2) Find the pair token by ID
  ctx?.step("Validating pair token");
  const pairToken = await models.ecosystemToken.findOne({
    where: { id: pair, status: true },
  });
  if (!pairToken) {
    ctx?.fail("Pair token not found or inactive");
    throw createError(404, "Pair token not found or inactive");
  }

  // 2.1) Check if a market with the same currency and pair already exists.
  // Using currencyToken.currency (instead of .symbol) based on your token schema.
  ctx?.step("Checking for existing market");
  const existingMarket = await models.futuresMarket.findOne({
    where: {
      currency: currencyToken.currency,
      pair: pairToken.currency,
    },
  });
  if (existingMarket) {
    ctx?.fail("Futures market already exists");
    throw createError(
      409,
      "Futures market with the given currency and pair already exists."
    );
  }

  // 3) Store the new market
  try {
    ctx?.step("Creating futures market");
    const result = await storeRecord({
      model: "futuresMarket",
      data: {
        currency: currencyToken.currency,
        pair: pairToken.currency,
        isTrending,
        isHot,
        metadata,
        status: true,
      },
    });
    ctx?.success("Futures market created successfully");
    return result;
  } catch (error: any) {
    if (error.name === "SequelizeUniqueConstraintError") {
      ctx?.fail("Unique constraint violation");
      throw createError(409, "Futures market already exists.");
    }
    ctx?.fail(`Failed to create futures market: ${error.message}`);
    throw error;
  }
};
