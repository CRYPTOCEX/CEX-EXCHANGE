"use strict";

/**
 * Renames the addon permission keys that broke the naming contract, WITHOUT
 * dropping the grants roles already hold.
 *
 * `20240402234643-permissions.js` is additive — it only inserts names that are
 * not in the table yet — so on an existing install it happily adds the new keys
 * and leaves the old ones behind as orphans. Every role that was granted
 * `view.hb.key` would keep pointing at a permission no route demands any more,
 * and the Hummingbot admin screens would 403 for everyone but Super Admin.
 * This seeder closes that gap.
 *
 * For each old key it: makes sure every replacement exists, re-points the old
 * key's role grants onto ALL of its replacements, then removes the old row
 * unless the key is still part of the contract.
 *
 * Idempotent and order-independent: it tolerates the replacements already
 * existing (fresh installs, or a re-run after `db:seed:all`), and does nothing
 * at all once the old keys are gone.
 *
 * ONE DELIBERATE TIGHTENING: `access.forex_trading` used to sit on
 * `settings/index.put.ts`, so anyone who could merely SEE the Forex menu could
 * also WRITE forex settings. Its grants are carried over to
 * `view.forex_trading.settings` only — `edit.forex_trading.settings` has to be
 * granted deliberately.
 */

// old key -> { to: [replacements], keep: true if the old key is still in use }
const RENAMES = {
  // --- Hummingbot: 33 routes were sharing two key-shaped permissions ---------
  "view.hb.key": {
    to: ["view.hb.key", "view.hb.command", "view.hb.instance", "view.hb.strategy", "access.hb"],
  },
  "edit.hb.key": {
    to: [
      "edit.hb.key",
      "manage.hb.command",
      "create.hb.instance",
      "edit.hb.instance",
      "delete.hb.instance",
      "manage.hb.instance",
      "create.hb.strategy",
      "edit.hb.strategy",
      "delete.hb.strategy",
    ],
  },
  "access.hummingbot": { to: ["access.hb"] },

  // --- Algo Trading Bots: "trading.bot" split the addon name on a dot -------
  "view.trading.bot": {
    to: [
      "access.trading_bot",
      "view.trading_bot.bot",
      "view.trading_bot.marketplace",
      "view.trading_bot.settings",
    ],
  },
  "manage.trading.bot": {
    to: [
      "manage.trading_bot.bot",
      "edit.trading_bot.marketplace",
      "edit.trading_bot.settings",
    ],
  },
  "view.trading.bot.log": { to: ["view.trading_bot.log"] },
  "view.trading.bot.review": { to: ["view.trading_bot.review"] },
  "edit.trading.bot.review": { to: ["edit.trading_bot.review"] },

  // --- Binary AI Engine: kebab domain, and 29 routes on one manage.* key ----
  "access.ai.binary-engine": { to: ["access.ai.binary_engine"] },
  "view.ai.binary-engine": {
    to: [
      "access.ai.binary_engine",
      "view.ai.binary_engine.engine",
      "view.ai.binary_engine.tier",
      "view.ai.binary_engine.cooldown",
      "view.ai.binary_engine.snapshot",
      "view.ai.binary_engine.correlation",
      "view.ai.binary_engine.analytics",
    ],
  },
  "manage.ai.binary-engine": {
    to: [
      "create.ai.binary_engine.engine",
      "edit.ai.binary_engine.engine",
      "delete.ai.binary_engine.engine",
      "manage.ai.binary_engine.engine",
      "create.ai.binary_engine.tier",
      "edit.ai.binary_engine.tier",
      "delete.ai.binary_engine.tier",
      "edit.ai.binary_engine.cooldown",
      "delete.ai.binary_engine.cooldown",
      "create.ai.binary_engine.snapshot",
      "manage.ai.binary_engine.snapshot",
      "edit.ai.binary_engine.correlation",
      "create.ai.binary_engine.analytics",
      "edit.ai.binary_engine.analytics",
      "delete.ai.binary_engine.analytics",
      "manage.ai.binary_engine.analytics",
    ],
  },
  "edit.ai.binary-engine": { to: ["edit.ai.binary_engine.engine"] },
  "create.ai.binary-engine": { to: ["create.ai.binary_engine.snapshot"] },
  "delete.ai.binary-engine": { to: ["delete.ai.binary_engine.snapshot"] },

  // --- AI Market Maker: the addon was spelled two different ways ------------
  "access.ai.market.maker": { to: ["access.ai.market_maker"] },
  "access.ai.market.maker.analytics": { to: ["access.ai.market_maker.analytics"] },
  "access.ai.market.maker.settings": { to: ["access.ai.market_maker.settings"] },
  "view.ai.market.maker": { to: ["edit.ai.market_maker.market"] },
  "create.ai.market.maker": { to: ["create.ai.market_maker.market"] },
  "view.ai.market-maker.market": { to: ["view.ai.market_maker.market"] },
  "create.ai.market-maker.market": { to: ["create.ai.market_maker.market"] },
  "edit.ai.market-maker.market": { to: ["edit.ai.market_maker.market"] },
  "delete.ai.market-maker.market": { to: ["delete.ai.market_maker.market"] },
  "view.ai.market-maker.bot": { to: ["view.ai.market_maker.bot"] },
  "edit.ai.market-maker.bot": { to: ["edit.ai.market_maker.bot"] },
  "view.ai.market-maker.pool": { to: ["view.ai.market_maker.pool"] },
  "edit.ai.market-maker.pool": { to: ["edit.ai.market_maker.pool"] },
  "view.ai.market-maker.analytics": { to: ["view.ai.market_maker.analytics"] },
  "edit.ai.market-maker.emergency": { to: ["manage.ai.market_maker.emergency"] },

  // The markets DataTable gated on an `ai.trading.market` family that NO backend
  // route has ever checked, so the button gate and the 403 gate disagreed
  // outright. Retired in favour of the keys the routes actually use.
  "access.ai.trading.market": { to: ["access.ai.market_maker.market"] },
  "view.ai.trading.market": { to: ["view.ai.market_maker.market"] },
  "create.ai.trading.market": { to: ["create.ai.market_maker.market"] },
  "edit.ai.trading.market": { to: ["edit.ai.market_maker.market"] },
  "delete.ai.trading.market": { to: ["delete.ai.market_maker.market"] },

  // --- Forex & Multi-Asset: calendar, news and economic-event were all ------
  // --- riding on the calendar and instrument keys ---------------------------
  "view.forex_trading.instrument": {
    keep: true,
    to: [
      "view.forex_trading.calendar",
      "view.forex_trading.economic_event",
      "view.forex_trading.news",
      "view.forex_trading.group",
    ],
  },
  "create.forex_trading.calendar": {
    to: [
      "create.forex_trading.calendar",
      "create.forex_trading.economic_event",
      "create.forex_trading.news",
    ],
  },
  "edit.forex_trading.calendar": {
    to: [
      "edit.forex_trading.calendar",
      "edit.forex_trading.economic_event",
      "edit.forex_trading.news",
    ],
  },
  "delete.forex_trading.calendar": {
    to: [
      "delete.forex_trading.calendar",
      "delete.forex_trading.economic_event",
      "delete.forex_trading.news",
    ],
  },
  "access.forex_trading.risk": { to: ["view.forex_trading.risk"] },
  // See "ONE DELIBERATE TIGHTENING" above.
  "access.forex_trading": { keep: true, to: ["view.forex_trading.settings"] },
};

const SELECT = (q) => ({ type: q.sequelize.QueryTypes.SELECT });

module.exports = {
  async up(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const rows = await queryInterface.sequelize.query(
        "SELECT id, name FROM permission",
        { ...SELECT(queryInterface), transaction: t }
      );
      const idByName = new Map(rows.map((r) => [r.name, r.id]));

      // 1. create every replacement that does not exist yet
      const wanted = [...new Set(Object.values(RENAMES).flatMap((r) => r.to))];
      const toInsert = wanted.filter((n) => !idByName.has(n));
      if (toInsert.length) {
        await queryInterface.bulkInsert(
          "permission",
          toInsert.map((name) => ({ name })),
          { transaction: t }
        );
        const fresh = await queryInterface.sequelize.query(
          "SELECT id, name FROM permission",
          { ...SELECT(queryInterface), transaction: t }
        );
        fresh.forEach((r) => idByName.set(r.name, r.id));
      }

      // 2. carry each old key's grants onto all of its replacements
      const grants = await queryInterface.sequelize.query(
        "SELECT roleId, permissionId FROM role_permission",
        { ...SELECT(queryInterface), transaction: t }
      );
      const held = new Set(grants.map((g) => g.roleId + ":" + g.permissionId));
      const added = [];

      for (const [oldName, spec] of Object.entries(RENAMES)) {
        const oldId = idByName.get(oldName);
        if (!oldId) continue;
        const roleIds = grants
          .filter((g) => g.permissionId === oldId)
          .map((g) => g.roleId);
        for (const roleId of roleIds) {
          for (const newName of spec.to) {
            const newId = idByName.get(newName);
            if (!newId) continue;
            const key = roleId + ":" + newId;
            if (held.has(key)) continue;
            held.add(key);
            added.push({ roleId, permissionId: newId });
          }
        }
      }
      if (added.length) {
        await queryInterface.bulkInsert("role_permission", added, { transaction: t });
      }

      // 3. drop the retired keys and the grants pointing at them
      const retired = Object.entries(RENAMES)
        .filter(([name, spec]) => !spec.keep && !spec.to.includes(name))
        .map(([name]) => idByName.get(name))
        .filter(Boolean);
      if (retired.length) {
        await queryInterface.sequelize.query(
          "DELETE FROM role_permission WHERE permissionId IN (:ids)",
          { replacements: { ids: retired }, transaction: t }
        );
        await queryInterface.sequelize.query(
          "DELETE FROM permission WHERE id IN (:ids)",
          { replacements: { ids: retired }, transaction: t }
        );
      }

      await t.commit();
      console.log(
        `[permission-key-rename] added ${toInsert.length} keys, ` +
          `carried ${added.length} grants, retired ${retired.length} keys`
      );
    } catch (error) {
      await t.rollback();
      console.error("[permission-key-rename] failed:", error);
      throw error;
    }
  },

  // Intentionally a no-op. Reversing would have to guess which of the new
  // fine-grained keys a role held before the split, and getting that wrong
  // hands out access nobody granted.
  async down() {},
};
