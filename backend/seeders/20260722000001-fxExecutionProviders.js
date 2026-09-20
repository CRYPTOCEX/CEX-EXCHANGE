"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

const FxExecutionProviders = [
  {
    name: "oanda",
    title: "OANDA v20",
    description:
      "A-book hedge execution via the OANDA v20 REST API: synchronous FOK market fills with priceBound, identical practice/live APIs and a gapless replayable transaction ledger. Requires APP_OANDA_API_KEY.",
  },
  {
    name: "metaapi",
    title: "MetaApi (MT4/MT5)",
    description:
      "A-book hedge execution on MetaTrader broker accounts via the MetaApi cloud REST API — coverage extender for MT-only brokers. Requires APP_METAAPI_TOKEN and the broker's written approval for datacenter logins.",
  },
];

async function fxExecutionProviderTableExists(queryInterface) {
  const result = await queryInterface.sequelize.query(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'fx_execution_provider'`,
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  return result[0].count > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!(await fxExecutionProviderTableExists(queryInterface))) {
      console.log(
        "fx_execution_provider table does not exist yet (forex_trading extension not installed), skipping fx execution providers seeder"
      );
      return;
    }

    const existing = await queryInterface.sequelize.query(
      "SELECT name FROM fx_execution_provider",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingNames = new Set(existing.map((p) => p.name));

    const newProviders = [];
    const updateProviders = [];

    FxExecutionProviders.forEach((provider) => {
      if (existingNames.has(provider.name)) {
        updateProviders.push(provider);
      } else {
        const now = new Date();
        newProviders.push({
          ...provider,
          id: uuidv4(),
          status: false,
          environment: "DEMO",
          orderTimeoutMs: 15000,
          hardTimeoutMs: 120000,
          marginBufferRatio: 0.2,
          marginAlertRatio: 0.5,
          staleSyncAlertSec: 300,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    if (newProviders.length > 0) {
      await queryInterface.bulkInsert("fx_execution_provider", newProviders, {});
    }

    // Update title/description by name; never touch status, environment,
    // accountRef, knobs or sync state
    for (const provider of updateProviders) {
      await queryInterface.sequelize.query(
        `UPDATE fx_execution_provider SET
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
    if (!(await fxExecutionProviderTableExists(queryInterface))) {
      return;
    }
    await queryInterface.bulkDelete("fx_execution_provider", null, {});
  },
};
