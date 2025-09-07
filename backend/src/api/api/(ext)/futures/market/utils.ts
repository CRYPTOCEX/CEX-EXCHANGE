import { models } from "@b/db";

export async function getFuturesMarket(
  currency: string,
  pair: string
): Promise<futuresMarketAttributes> {
  const market = await models.futuresMarket.findOne({
    where: {
      currency,
      pair,
    },
  });

  if (!market) {
    throw new Error("Futures market not found");
  }

  return market;
}

import {
  baseNumberSchema,
  baseStringSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

export const baseFuturesMarketSchema = {
  id: baseNumberSchema("Futures Market ID"),
  currency: baseStringSchema("Futures market currency"),
  pair: baseStringSchema("Futures market pair"),
  status: baseBooleanSchema("Futures market status"),
};
