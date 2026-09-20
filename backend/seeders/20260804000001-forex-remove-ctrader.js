"use strict";

/**
 * Retires the cTrader integration from the forex_trading extension.
 *
 * Spotware refused our Open API application, so both cTrader adapters — the
 * quote provider on `fx_provider` and the A-book execution bridge on
 * `fx_execution_provider` — have been deleted from the codebase. The rows
 * outlive the code: both were shipped by earlier seeders, and those seeders
 * are recorded as executed so they never re-run and never clean up after
 * themselves. Without this an install keeps a provider row whose adapter no
 * longer constructs, which the admin can still click Enable on.
 *
 * THE QUOTE PROVIDER is a pure config row — nothing references it by id, and
 * `fx_instrument.providerSymbols` keys off the provider NAME — so it is
 * deleted outright and its symbol mappings are stripped. If it happened to be
 * the ACTIVE provider this leaves the desk with none, which is loud on
 * purpose: the alternative is a feed that silently cannot quote, and this
 * extension refuses every open and close while a symbol is not QUOTING.
 *
 * THE EXECUTION VENUE is not a pure config row, and that is the whole reason
 * this is not two DELETEs. `fx_position`, `fx_order` and `fx_deal` carry
 * `executionProviderId` as a bare UUID with NO foreign key, so deleting the
 * provider would not null those columns — it would leave them pointing at
 * nothing, and a hedged position whose venue cannot be resolved is a position
 * nobody can account for. So:
 *
 *    referenced by any position/order/deal -> DISABLE and keep the row
 *    otherwise                             -> delete it
 *
 * The kept row is status=false, so it can never be selected for routing
 * again, and its title says why it is there. Operators with open cTrader
 * hedges must close them at the broker directly — the bridge that could do it
 * from here no longer exists — and the retained row is what lets them read
 * their own history while they do.
 *
 * Routing rules and alerts pointing at the venue are deleted in BOTH branches:
 * a rule targeting a venue with no adapter can only produce failed routing,
 * and the rule's FK is `onDelete: SET NULL`, which would otherwise turn an
 * EXTERNAL rule into one with no target — invalid at the app level and
 * harder to diagnose than an absent rule.
 *
 * Idempotent: every step is a no-op once the rows are gone. `down` is empty —
 * an integration the vendor refused is not something to restore.
 */

const SELECT = (queryInterface) => ({
  type: queryInterface.sequelize.QueryTypes.SELECT,
});

const log = (message) => {
  // eslint-disable-next-line no-console
  console.log(`[forex-remove-ctrader] ${message}`);
};

async function tableExists(queryInterface, table) {
  const result = await queryInterface.sequelize.query(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = :table`,
    { replacements: { table }, ...SELECT(queryInterface) }
  );
  return Number(result[0].count) > 0;
}

async function countReferences(queryInterface, table, providerId) {
  if (!(await tableExists(queryInterface, table))) return 0;
  const rows = await queryInterface.sequelize.query(
    `SELECT COUNT(*) as count FROM ${table} WHERE executionProviderId = :id`,
    { replacements: { id: providerId }, ...SELECT(queryInterface) }
  );
  return Number(rows[0].count);
}

module.exports = {
  async up(queryInterface) {
    /* ---------------- quote provider (fx_provider) ---------------- */
    if (await tableExists(queryInterface, "fx_provider")) {
      const rows = await queryInterface.sequelize.query(
        "SELECT id, status FROM fx_provider WHERE name = 'ctrader'",
        SELECT(queryInterface)
      );
      if (rows.length) {
        if (rows.some((row) => !!row.status)) {
          log(
            "WARNING: cTrader was the ACTIVE quote provider. The desk now has " +
              "no active provider — enable another one (Admin -> Forex -> " +
              "Providers) before trading resumes. Instruments cannot quote, " +
              "and every open and close is refused, until you do."
          );
        }
        await queryInterface.sequelize.query(
          "DELETE FROM fx_provider WHERE name = 'ctrader'"
        );
        log(`removed ${rows.length} cTrader quote provider row(s)`);
      }
    }

    /* ------- stale symbol mappings (fx_instrument.providerSymbols) ------- */
    // A TEXT column holding a JSON object keyed by provider name. Read and
    // rewrite in JS rather than JSON_REMOVE: this product runs on MariaDB as
    // well as MySQL, and the column has been written as both an object and a
    // JSON-encoded string over its life.
    if (await tableExists(queryInterface, "fx_instrument")) {
      const instruments = await queryInterface.sequelize.query(
        "SELECT id, providerSymbols FROM fx_instrument WHERE providerSymbols LIKE '%ctrader%'",
        SELECT(queryInterface)
      );
      let stripped = 0;
      for (const instrument of instruments) {
        let parsed = instrument.providerSymbols;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            continue; // unreadable JSON is not evidence of anything
          }
        }
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          continue;
        }
        if (!("ctrader" in parsed)) continue;
        delete parsed.ctrader;
        await queryInterface.sequelize.query(
          "UPDATE fx_instrument SET providerSymbols = :symbols, updatedAt = updatedAt WHERE id = :id",
          {
            replacements: {
              symbols: Object.keys(parsed).length ? JSON.stringify(parsed) : null,
              id: instrument.id,
            },
          }
        );
        stripped++;
      }
      if (stripped) {
        log(`stripped the cTrader symbol mapping from ${stripped} instrument(s)`);
      }
    }

    /* ------------ execution venue (fx_execution_provider) ------------ */
    if (!(await tableExists(queryInterface, "fx_execution_provider"))) return;

    const providers = await queryInterface.sequelize.query(
      "SELECT id, status FROM fx_execution_provider WHERE name = 'ctrader'",
      SELECT(queryInterface)
    );
    if (!providers.length) return;

    for (const provider of providers) {
      // Rules and alerts go first, in both branches — see the header.
      if (await tableExists(queryInterface, "fx_routing_rule")) {
        const [, meta] = await queryInterface.sequelize.query(
          "DELETE FROM fx_routing_rule WHERE executionProviderId = :id",
          { replacements: { id: provider.id } }
        );
        const removed = meta?.affectedRows ?? 0;
        if (removed) log(`removed ${removed} routing rule(s) targeting cTrader`);
      }
      if (await tableExists(queryInterface, "fx_execution_alert")) {
        await queryInterface.sequelize.query(
          "DELETE FROM fx_execution_alert WHERE executionProviderId = :id",
          { replacements: { id: provider.id } }
        );
      }

      const positions = await countReferences(
        queryInterface,
        "fx_position",
        provider.id
      );
      const orders = await countReferences(queryInterface, "fx_order", provider.id);
      const deals = await countReferences(queryInterface, "fx_deal", provider.id);
      const referenced = positions + orders + deals;

      if (referenced > 0) {
        await queryInterface.sequelize.query(
          `UPDATE fx_execution_provider SET
             status = false,
             title = 'cTrader Open API (retired)',
             description = :description,
             updatedAt = updatedAt
           WHERE id = :id`,
          {
            replacements: {
              id: provider.id,
              description:
                "RETIRED — the cTrader bridge has been removed from this " +
                "release and cannot execute, close or reconcile anything. " +
                "This row is kept only so historical positions, orders and " +
                "deals still resolve their venue. Close any remaining hedges " +
                "directly at the broker.",
            },
          }
        );
        log(
          `cTrader execution venue DISABLED but kept: still referenced by ` +
            `${positions} position(s), ${orders} order(s), ${deals} deal(s). ` +
            `Close any open hedges at the broker directly — the bridge is gone.`
        );
      } else {
        await queryInterface.sequelize.query(
          "DELETE FROM fx_execution_provider WHERE id = :id",
          { replacements: { id: provider.id } }
        );
        log("removed the unreferenced cTrader execution venue row");
      }
    }
  },

  async down() {
    // Deliberately empty: the adapters this row described no longer exist in
    // the codebase, so re-inserting it would only recreate an unusable venue.
  },
};
