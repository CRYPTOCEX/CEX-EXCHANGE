import {
  baseStringSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the binary market");
const currency = baseStringSchema(
  "Trading currency of the binary market",
  191
);
const pair = baseStringSchema("Trading pair of the binary market", 191);
const isTrending = {
  ...baseBooleanSchema("Indicates if the binary market is currently trending"),
  nullable: true,
};
const isHot = {
  ...baseBooleanSchema("Indicates if the binary market is considered 'hot'"),
  nullable: true,
};
const status = baseBooleanSchema("Operational status of the binary market");

export const binaryMarketSchema = {
  id,
  currency,
  pair,
  isTrending,
  isHot,
  status,
};

export const BinaryMarketStoreSchema = {
  type: "object",
  properties: {
    currency,
    pair,
    isTrending,
    isHot,
    status,
  },
  required: ["currency", "pair", "status"],
};

export const BinaryMarketUpdateSchema = {
  type: "object",
  properties: {
    currency,
    pair,
    isTrending,
    isHot,
    status,
  },
  required: ["currency", "pair"],
};