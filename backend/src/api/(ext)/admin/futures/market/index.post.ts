import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { FuturesMarketStoreSchema, FuturesMarketUpdateSchema } from "./utils";
import { models } from "@b/db"; // Adjust path as needed
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Stores a new Futures Market",
  operationId: "storeFuturesMarket",
  tags: ["Admin", "Futures Markets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: FuturesMarketUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(FuturesMarketStoreSchema, "Futures Market"),
  requiresAuth: true,
  permission: "create.futures.market",
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
  // Using currencyToken.currency (instead of .symbol) based on your token schema.
  const existingMarket = await models.futuresMarket.findOne({
    where: {
      currency: currencyToken.currency,
      pair: pairToken.currency,
    },
  });
  if (existingMarket) {
    throw createError(
      409,
      "Futures market with the given currency and pair already exists."
    );
  }

  // 3) Store the new market
  try {
    return await storeRecord({
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
  } catch (error: any) {
    if (error.name === "SequelizeUniqueConstraintError") {
      throw createError(409, "Futures market already exists.");
    }
    throw error;
  }
};
