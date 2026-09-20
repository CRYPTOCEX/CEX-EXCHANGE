"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

const FxProviders = [
  {
    name: "twelvedata",
    title: "Twelve Data",
    description:
      "Primary multi-asset provider: forex, US & global stocks, spot commodities (gold/silver/oil) and indices over one REST + WebSocket API. Requires APP_TWELVEDATA_API_KEY.",
  },
  {
    name: "finnhub",
    title: "Finnhub",
    description:
      "Free-tier friendly provider for development and demos: real-time US stock quotes, forex and crypto with a 50-symbol WebSocket. Requires APP_FINNHUB_API_KEY.",
  },
  {
    name: "tradermade",
    title: "TraderMade",
    description:
      "FX-specialist provider: forex pairs and precious metals (XAU/XAG) with multi-symbol REST live rates, 25+ years of history and WebSocket streaming on streaming-enabled plans. No stocks or indices. Requires APP_TRADERMADE_API_KEY.",
  },
  {
    name: "polygon",
    title: "Polygon / Massive",
    description:
      "US stocks & ETF specialist: NYSE/Nasdaq stocks and index ETFs via the Polygon (Massive) REST + WebSocket APIs — snapshot quotes, aggregate history, dividends and splits. No forex. Requires APP_POLYGON_API_KEY.",
  },
];

async function fxProviderTableExists(queryInterface) {
  const result = await queryInterface.sequelize.query(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'fx_provider'`,
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  return result[0].count > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!(await fxProviderTableExists(queryInterface))) {
      console.log(
        "fx_provider table does not exist yet (forex_trading extension not installed), skipping fx providers seeder"
      );
      return;
    }

    const existing = await queryInterface.sequelize.query(
      "SELECT name FROM fx_provider",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingNames = new Set(existing.map((p) => p.name));

    const newProviders = [];
    const updateProviders = [];

    FxProviders.forEach((provider) => {
      if (existingNames.has(provider.name)) {
        updateProviders.push(provider);
      } else {
        newProviders.push({
          ...provider,
          id: uuidv4(),
          status: false,
        });
      }
    });

    if (newProviders.length > 0) {
      await queryInterface.bulkInsert("fx_provider", newProviders, {});
    }

    // Update title/description by name; never touch status or proxyUrl
    for (const provider of updateProviders) {
      await queryInterface.sequelize.query(
        `UPDATE fx_provider SET
          title = :title,
          description = :description
        WHERE name = :name`,
        {
          replacements: {
            title: provider.title,
            description: provider.description,
            name: provider.name,
          },
        }
      );
    }
  },

  async down(queryInterface) {
    if (!(await fxProviderTableExists(queryInterface))) {
      return;
    }
    await queryInterface.bulkDelete("fx_provider", null, {});
  },
};
