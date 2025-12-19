import { storeRecord } from "@b/utils/query";
import {
  MarketStoreSchema,
  MarketUpdateSchema,
} from "@b/api/admin/finance/exchange/market/utils";
import { models } from "@b/db";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Creates a new ecosystem market",
  description:
    "Creates a new ecosystem market with the specified currency and pair tokens. The endpoint validates that both tokens exist and are active, checks for duplicate markets, and stores the new market with trending/hot indicators and metadata. The market is created with active status by default.",
  operationId: "storeEcosystemMarket",
  tags: ["Admin", "Ecosystem", "Market"],
  logModule: "ADMIN_ECO",
  logTitle: "Create market",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: MarketUpdateSchema,
      },
    },
  },
  responses: {
    200: MarketStoreSchema,
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Token"),
    409: conflictResponse("Ecosystem Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.ecosystem.market",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { currency, pair, isTrending, isHot, metadata } = body;

  ctx?.step("Validating currency token");
  // 1) Find the currency token by ID
  const currencyToken = await models.ecosystemToken.findOne({
    where: { id: currency, status: true },
  });
  if (!currencyToken) {
    throw createError(404, "Currency token not found or inactive");
  }

  ctx?.step("Validating pair token");
  // 2) Find the pair token by ID
  const pairToken = await models.ecosystemToken.findOne({
    where: { id: pair, status: true },
  });
  if (!pairToken) {
    throw createError(404, "Pair token not found or inactive");
  }

  ctx?.step("Checking for existing market");
  // 2.1) Check if a market with the same currency and pair already exists.
  //     (Assuming a unique constraint on the combination of currency and pair.)
  const existingMarket = await models.ecosystemMarket.findOne({
    where: {
      currency: currencyToken.currency, // or use currencyToken.symbol if preferred
      pair: pairToken.currency,
    },
  });
  if (existingMarket) {
    throw createError(
      409,
      "Ecosystem market with the given currency and pair already exists."
    );
  }

  // 3) Store the new market
  try {
    ctx?.step("Creating market record");
    const result = await storeRecord({
      model: "ecosystemMarket",
      data: {
        currency: currencyToken.currency, // or currencyToken.symbol if preferred
        pair: pairToken.currency,
        isTrending,
        isHot,
        metadata,
        status: true,
      },
    });

    ctx?.success("Market created successfully");
    return result;
  } catch (error: any) {
    // If the error is due to a unique constraint violation, throw a 409 error.
    if (error.name === "SequelizeUniqueConstraintError") {
      ctx?.fail("Market already exists");
      throw createError(409, "Ecosystem market already exists.");
    }
    // Otherwise, rethrow the error.
    ctx?.fail(error.message);
    throw error;
  }
};
