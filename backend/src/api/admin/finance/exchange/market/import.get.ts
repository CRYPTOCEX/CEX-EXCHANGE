import ExchangeManager from "@b/utils/exchange";
import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { countDecimals } from "../utils";

export const metadata = {
  summary: "Import Exchange Markets",
  operationId: "importMarkets",
  tags: ["Admin", "Settings", "Exchange"],
  description:
    "Imports markets from the specified exchange, processes their data, and saves them to the database.",
  requiresAuth: true,
  responses: {
    200: {
      description: "Markets imported successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange"),
    500: serverErrorResponse,
  },
  permission: "create.exchange.market",
};

export default async (data: Handler) => {
  const exchange = await ExchangeManager.startExchange();
  const provider = await ExchangeManager.getProvider();
  if (!exchange) {
    throw new Error(`Failed to start exchange provider: ${provider}`);
  }

  await exchange.loadMarkets();
  const markets = exchange.markets as unknown as any[];

  const validSymbols = {};

  for (const market of Object.values(markets)) {
    if (market.active && market.precision.price && market.precision.amount) {
      if (
        provider &&
        ["binance", "xt"].includes(provider) &&
        market.type !== "spot"
      ) {
        continue;
      }
      const { symbol, precision, limits, taker, maker } = market;

      validSymbols[symbol] = {
        taker,
        maker,
        precision: {
          price: countDecimals(precision.price),
          amount: countDecimals(precision.amount),
        },
        limits: {
          amount: limits.amount || { min: 0, max: null },
          price: limits.price || { min: 0, max: null },
          cost: limits.cost || { min: 0.0001, max: 9000000 },
          leverage: limits.leverage || {},
        },
      };
    }
  }

  const newMarketSymbols = Object.keys(validSymbols);

  // Fetch existing markets
  const existingMarkets = await models.exchangeMarket.findAll({
    attributes: ["currency", "pair"],
  });
  const existingMarketSymbols: Set<string> = new Set(
    existingMarkets.map((m) => `${m.currency}/${m.pair}`)
  );

  // Determine markets to delete
  const marketsToDelete: string[] = [...existingMarketSymbols].filter(
    (symbol) => !newMarketSymbols.includes(symbol as string)
  );

  // Begin transaction
  await sequelize.transaction(async (transaction) => {
    // Delete unwanted markets
    if (marketsToDelete.length > 0) {
      await models.exchangeMarket.destroy({
        where: {
          [Op.or]: marketsToDelete.map((symbol) => {
            const [currency, pair] = symbol.split("/");
            return { currency, pair };
          }),
        },
        transaction,
      });

      await models.exchangeOrder.destroy({
        where: {
          [Op.or]: marketsToDelete.map((symbol) => {
            const [currency, pair] = symbol.split("/");
            return { currency, pair };
          }),
        },
        transaction,
      });

      await models.exchangeWatchlist.destroy({
        where: {
          [Op.or]: marketsToDelete.map((symbol) => {
            const [currency, pair] = symbol.split("/");
            return { currency, pair };
          }),
        },
        transaction,
      });
    }

    // Save valid markets
    await saveValidMarkets(validSymbols, transaction);
  });

  return {
    message: "Exchange markets imported and saved successfully!",
  };
};

async function saveValidMarkets(validSymbols: any, transaction: any) {
  const existingMarkets = await models.exchangeMarket.findAll({
    attributes: ["currency", "pair"],
    transaction,
  });
  const existingMarketSymbols = new Set(
    existingMarkets.map((m) => `${m.currency}/${m.pair}`)
  );

  for (const symbolKey of Object.keys(validSymbols)) {
    const symbolData = validSymbols[symbolKey];
    const [currency, pair] = symbolKey.split("/");

    if (!existingMarketSymbols.has(symbolKey)) {
      await models.exchangeMarket.create(
        {
          currency,
          pair,
          metadata: symbolData,
          status: false,
        },
        { transaction }
      );
    }
  }
}
