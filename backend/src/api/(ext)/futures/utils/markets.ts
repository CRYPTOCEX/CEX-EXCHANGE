import { models } from "@b/db";

export async function getFuturesMarkets(): Promise<futuresMarketAttributes[]> {
  return models.futuresMarket.findAll({
    where: {
      status: true,
    },
  });
}
