import { models } from "@b/db";

export async function getEcoSystemMarkets(): Promise<
  ecosystemMarketAttributes[]
> {
  return models.ecosystemMarket.findAll({
    where: {
      status: true,
    },
  });
}
