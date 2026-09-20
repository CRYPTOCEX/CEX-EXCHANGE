"use strict";

/**
 * Registers TransFi as a fiat PAYOUT provider.
 *
 * Ships with BOTH switches off:
 *   status:       false — the provider is not usable until an operator enables it
 *   autoDispatch: false — even then, withdrawals wait for admin approval
 *
 * That is deliberate. This is the platform's first outbound money movement, and
 * "enabled by existing" is not an acceptable default for something that sends
 * customer funds to third parties.
 *
 * Corridors and limits below were read from the live API on 2026-08-02:
 *   GET /v3/config/supported-currencies?direction=withdraw   (27 currencies)
 *   GET /v3/config/payment-methods?direction=withdraw&currency=…
 *
 * PREREQUISITE an operator must understand: payouts spend a PREFUNDED balance at
 * TransFi, not collected deposits. Collected payins sit in `totalUnsettledAmount`
 * and are NOT payout capacity. Funding is a separate treasury operation
 * (orderType `fiat_prefund`, `PF-` order ids).
 */

/**
 * Every sibling seeder that touches a table outside the oldest core set checks
 * for it first, and this one did not. On a fresh install the seeders run against
 * whatever `initial.sql` imported and nothing else — the backend's `alter` sync
 * has not started yet — so a table the dump was missing was not a degraded
 * install here, it was a fatal one:
 *
 *     == 20260802000001-transfi-withdraw-gateway: migrating =======
 *     ERROR: Table 'zervex.withdraw_gateway' doesn't exist
 *
 * `db:seed:all` aborts the whole run on the first error, so that took the DEX
 * tokens, the AI-support persona and the support-ticket status repair down with
 * it, silently. `initial.sql` is now generated from the models and does contain
 * the table (see `scripts/build-initial-sql.ts`); this guard is what makes the
 * failure survivable if it ever goes missing again.
 */
async function tableExists(queryInterface, table) {
  const [row] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = :table`,
    {
      replacements: { table },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return Number(row.count) > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = await import("uuid");

    if (!(await tableExists(queryInterface, "withdraw_gateway"))) {
      console.log(
        "withdraw_gateway table does not exist yet, skipping TransFi withdraw gateway seeder"
      );
      return;
    }

    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM withdraw_gateway WHERE alias = 'transfi' OR name = 'TransFi' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (existing.length) {
      console.log("TransFi withdraw gateway already present; skipping insert.");
      return;
    }

    const currencies = [
      "AED", "ARS", "AUD", "BDT", "BRL", "CAD", "CLP", "CNY", "COP", "EUR",
      "GHS", "IDR", "JPY", "KES", "MXN", "MYR", "NGN", "PEN", "PHP", "PKR",
      "THB", "TZS", "UGX", "USD", "XAF", "XOF", "ZMW",
    ];

    const zero = Object.fromEntries(currencies.map((c) => [c, 0]));

    // Observed per-corridor payout windows. Zero-decimal currencies are NOT
    // scaled — TransFi takes major units in both directions.
    const minAmount = {
      ...zero,
      KES: 10, USD: 1, EUR: 1, NGN: 100, GHS: 1, TZS: 10, UGX: 500,
      ZMW: 1, XAF: 100, XOF: 200,
    };
    const maxAmount = {
      ...Object.fromEntries(currencies.map((c) => [c, 1000000])),
      KES: 70000, USD: 2000000, NGN: 500000000, GHS: 100000,
      TZS: 10000000, UGX: 7000000, ZMW: 20000, XAF: 500000, XOF: 2000000,
    };

    let numeric = false;
    try {
      const table = await queryInterface.describeTable("withdraw_gateway");
      const t = String(table.minAmount?.type || "JSON").toUpperCase();
      numeric = t.includes("DOUBLE") || t.includes("DECIMAL") || t.includes("FLOAT");
    } catch {
      numeric = false;
    }
    const encode = (map, fallback) => (numeric ? fallback : JSON.stringify(map));

    await queryInterface.bulkInsert("withdraw_gateway", [
      {
        id: uuidv4(),
        name: "TransFi",
        title: "TransFi",
        description:
          "Global fiat payouts to bank accounts, IBANs and mobile wallets across 27 currencies. " +
          "Spends a prefunded TransFi balance — collected deposits are not payout capacity.",
        image: "/img/gateways/transfi.png",
        alias: "transfi",
        status: false,
        autoDispatch: false,
        version: "0.0.1",
        currencies: JSON.stringify(currencies),
        // Platform's own fee on top of TransFi's ~2%. Zero by default: inventing a
        // margin before a rate card exists would silently overcharge customers.
        fixedFee: encode(zero, 0),
        percentageFee: encode(zero, 0),
        minAmount: encode(minAmount, 1),
        maxAmount: encode(maxAmount, 1000000),
        type: "FIAT",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(
      "Inserted TransFi withdraw gateway (status: false, autoDispatch: false — enable both explicitly)."
    );
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, "withdraw_gateway"))) return;
    // Scoped delete, unlike the original deposit-gateway seeder's down() which
    // empties the whole table.
    await queryInterface.bulkDelete("withdraw_gateway", { alias: "transfi" }, {});
  },
};
