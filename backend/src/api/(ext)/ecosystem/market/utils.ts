import { models } from "@b/db";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

export async function getMarket(
  currency: string,
  pair: string,
  ctx?: LogContext
): Promise<ecosystemMarketAttributes> {
  try {
    ctx?.step?.(`Fetching market for ${currency}/${pair}`);
    const market = await models.ecosystemMarket.findOne({
      where: {
        currency,
        pair,
      },
    });

    if (!market) {
      ctx?.fail?.("Market not found");
      throw new Error("Market not found");
    }

    ctx?.success?.(`Market found for ${currency}/${pair}`);
    return market;
  } catch (error) {
    if (error.message !== "Market not found") {
      ctx?.fail?.(error.message);
    }
    throw error;
  }
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
