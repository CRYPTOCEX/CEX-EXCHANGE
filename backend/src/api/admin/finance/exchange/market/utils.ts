import {
  baseStringSchema,
  baseBooleanSchema,
  baseNumberSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the market");
const currency = baseStringSchema("Trading currency of the market", 191);
const pair = baseStringSchema("Trading pair of the market", 191);
const isTrending = {
  ...baseBooleanSchema("Indicates if the market is currently trending"),
  nullable: true,
};
const isHot = {
  ...baseBooleanSchema("Indicates if the market is considered 'hot'"),
  nullable: true,
};
const metadata = {
  type: "object",
  nullable: true,
  properties: {
    precision: {
      type: "object",
      properties: {
        amount: baseNumberSchema("Amount precision"),
        price: baseNumberSchema("Price precision"),
      },
    },
    limits: {
      type: "object",
      properties: {
        amount: {
          type: "object",
          properties: {
            min: baseNumberSchema("Minimum amount"),
            max: baseNumberSchema("Maximum amount", true),
          },
        },
        price: {
          type: "object",
          properties: {
            min: baseNumberSchema("Minimum price", true),
            max: baseNumberSchema("Maximum price", true),
          },
        },
        cost: {
          type: "object",
          properties: {
            min: baseNumberSchema("Minimum cost"),
            max: baseNumberSchema("Maximum cost"),
          },
        },
        leverage: {
          type: "object",
          properties: {
            type: baseStringSchema("Leverage type", 50, 0, true),
            value: baseNumberSchema("Leverage value", true),
          },
        },
      },
    },
    taker: baseNumberSchema("Taker fee"),
    maker: baseNumberSchema("Maker fee"),
  },
};

const status = baseBooleanSchema("Operational status of the market");

export const marketSchema = {
  id,
  currency,
  pair,
  isTrending,
  isHot,
  metadata,
  status,
};

export const baseMarketSchema = {
  id,
  currency,
  pair,
  isTrending,
  isHot,
  metadata,
  status,
};

export const MarketUpdateSchema = {
  type: "object",
  properties: {
    isTrending,
    isHot,
    metadata,
  },
};

export const MarketStoreSchema = {
  description: `Market created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseMarketSchema,
      },
    },
  },
};
