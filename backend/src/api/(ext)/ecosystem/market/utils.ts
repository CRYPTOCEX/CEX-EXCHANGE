import { models } from "@b/db";

export async function getMarket(
  currency: string,
  pair: string
): Promise<ecosystemMarketAttributes> {
  const market = await models.ecosystemMarket.findOne({
    where: {
      currency,
      pair,
    },
  });

  if (!market) {
    throw new Error("Market not found");
  }

  return market;
}

import {
  baseNumberSchema,
  baseStringSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

export const baseMarketSchema = {
  id: baseNumberSchema("Market ID"),
  name: baseStringSchema("Market name"),
  status: baseBooleanSchema("Market status"),
};
