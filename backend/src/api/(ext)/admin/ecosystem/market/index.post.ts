import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  MarketStoreSchema,
  MarketUpdateSchema,
} from "@b/api/admin/finance/exchange/market/utils";
import { models } from "@b/db"; // Adjust path as needed
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Stores a new Ecosystem Market",
  operationId: "storeEcosystemMarket",
  tags: ["Admin", "Ecosystem Markets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: MarketUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(MarketStoreSchema, "Ecosystem Market"),
  requiresAuth: true,
  permission: "create.ecosystem.market",
};

export default async (data: Handler) => {
  const { body } = data;
  const { currency, pair, isTrending, isHot, metadata } = body;

  // 1) Find the currency token by ID
  const currencyToken = await models.ecosystemToken.findOne({
    where: { id: currency, status: true },
  });
  if (!currencyToken) {
    throw createError(404, "Currency token not found or inactive");
  }

  // 2) Find the pair token by ID
  const pairToken = await models.ecosystemToken.findOne({
    where: { id: pair, status: true },
  });
  if (!pairToken) {
    throw createError(404, "Pair token not found or inactive");
  }

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
    return await storeRecord({
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
  } catch (error: any) {
    // If the error is due to a unique constraint violation, throw a 409 error.
    if (error.name === "SequelizeUniqueConstraintError") {
      throw createError(409, "Ecosystem market already exists.");
    }
    // Otherwise, rethrow the error.
    throw error;
  }
};
