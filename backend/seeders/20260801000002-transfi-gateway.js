"use strict";

/**
 * Registers the TransFi deposit gateway.
 *
 * This is a separate, dated seeder rather than another entry in
 * 20240402234615-depositGateways.js because that one dedupes on `name` and has
 * already run on every existing install — appending to it would never insert.
 * There is also no admin CREATE endpoint for deposit_gateway (the table only has
 * GET/PUT routes and the admin list page hard-disables create), so a migration is
 * the only way a row can be born.
 *
 * DEPLOY DEPENDENCY: this must be run against the production database, and the
 * compiled gateway must exist under backend/dist, or the gateway is invisible in
 * prod while working perfectly in dev.
 *
 * The currency list and fee figures below are not guesses — they were read from
 * the live API on 2026-08-01 for MID TIDD20_NA_NA:
 *   GET /v3/config/supported-currencies?direction=deposit
 *   GET /v3/exchange-rates?...            (processingFeeRate 0.02 across corridors)
 * `status: false` so an operator must explicitly enable it after setting the
 * APP_TRANSFI_* environment variables.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = await import("uuid");

    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM deposit_gateway WHERE alias = 'transfi' OR name = 'TransFi' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (existing.length) {
      console.log("TransFi deposit gateway already present; skipping insert.");
      return;
    }

    // Currencies this MID has enabled for deposit, intersected with what the
    // platform is likely to have currency rows for. An operator narrows this in
    // the admin UI; they cannot widen it beyond what TransFi accepts.
    const currencies = [
      "AED", "ARS", "AUD", "BDT", "BRL", "CAD", "CLP", "COP", "EUR", "GHS",
      "IDR", "KES", "MXN", "MYR", "NGN", "PEN", "PHP", "PKR", "TZS", "UGX",
      "USD", "XAF", "XOF", "ZMW",
    ];

    // TransFi deducts its own processing fee before settling to us, so these are
    // the PLATFORM's fee on top. Default to zero rather than inventing a margin —
    // an operator sets their own, and a fabricated number here would silently
    // overcharge on day one.
    const zeroPerCurrency = Object.fromEntries(currencies.map((c) => [c, 0]));

    // Effective per-corridor minimums observed live (the intersection of the
    // quote's minLimit and the payment method's minAmount). Zero-decimal
    // currencies are NOT scaled — TransFi takes major units throughout.
    const minAmount = {
      ...zeroPerCurrency,
      KES: 136, NGN: 1434, GHS: 100, TZS: 10, UGX: 500, ZMW: 1,
      XAF: 100, XOF: 200, EUR: 23, USD: 1,
    };

    const maxAmount = {
      ...Object.fromEntries(currencies.map((c) => [c, 1000000])),
      KES: 70000, NGN: 500000000, GHS: 100000, TZS: 10000000, UGX: 7000000,
      ZMW: 20000, XAF: 500000, XOF: 2000000, EUR: 100000, USD: 1000000,
    };

    // The seeder in 20240402234615 sniffs the column type and collapses a
    // per-currency map to a single scalar when the column is DOUBLE/DECIMAL
    // rather than TEXT/JSON. Do the same check here so the row lands correctly
    // either way instead of writing "[object Object]".
    let numericFeeColumns = false;
    try {
      const table = await queryInterface.describeTable("deposit_gateway");
      const t = String(table.minAmount?.type || "TEXT").toUpperCase();
      numericFeeColumns = t.includes("DOUBLE") || t.includes("DECIMAL") || t.includes("FLOAT");
    } catch {
      numericFeeColumns = false;
    }

    const encode = (map, fallback) =>
      numericFeeColumns ? fallback : JSON.stringify(map);

    await queryInterface.bulkInsert("deposit_gateway", [
      {
        id: uuidv4(),
        name: "TransFi",
        title: "TransFi",
        description:
          "Global fiat on-ramp covering African mobile money (M-Pesa, MTN, Airtel, Vodafone, Wave, Orange), " +
          "Nigerian bank transfer, SEPA/Open Banking in the EU and USD wire — 24 deposit currencies across 70+ countries.",
        image: "/img/gateways/transfi.png",
        alias: "transfi",
        status: false,
        version: "0.0.1",
        currencies: JSON.stringify(currencies),
        fixedFee: encode(zeroPerCurrency, 0),
        percentageFee: encode(zeroPerCurrency, 0),
        minAmount: encode(minAmount, 1),
        maxAmount: encode(maxAmount, 1000000),
        type: "FIAT",
        productId: null,
      },
    ]);

    console.log("Inserted TransFi deposit gateway (status: false — enable it in admin).");
  },

  async down(queryInterface) {
    // Scoped delete. The original gateway seeder's down() bulk-deletes EVERY row
    // in the table, which would take the other 15 gateways with it.
    await queryInterface.bulkDelete("deposit_gateway", { alias: "transfi" }, {});
  },
};
