"use strict";

/**
 * Grants the Spot Deposit Intent keys to the roles that already run the deposit
 * queue.
 *
 * ---------------------------------------------------------------------------
 * WHY A SECOND SEEDER
 * ---------------------------------------------------------------------------
 * `20240402234643-permissions.js` CREATES `view.spot.deposit.intent` and
 * `edit.spot.deposit.intent`, so every drift gate passes: the routes name keys
 * that exist, and the manifest agrees with the screen. But that seeder is the
 * registry only — it inserts rows into `permission` and grants nothing. On an
 * EXISTING install the result is a console that exists and that nobody can
 * open: `rolesGate` 403s the routes, the menu entry filters itself out, and the
 * screen is simply not there. Only Super Admin can reach it, because Super
 * Admin bypasses the gate BY NAME while holding zero permission rows of its
 * own — so whoever tests the upgrade as the owner of the install sees a working
 * console and every configured role sees nothing.
 *
 * That is not hypothetical here. It is exactly what happened to Market News
 * (`20260827000001-market-news-permissions.js`), and this console matters more:
 * a REVIEW intent is a customer whose deposit is sitting on the exchange
 * uncredited, and an operator who cannot open the screen cannot pay them.
 *
 * ---------------------------------------------------------------------------
 * WHY TWO WITNESSES INSTEAD OF ONE, AND WHY NOT "Admin"
 * ---------------------------------------------------------------------------
 * A seeder that hardcodes `WHERE role.name = 'Admin'` does nothing on an
 * install whose operator renamed the role, split it, or built their own — and
 * does it silently, which is the failure this seeder exists to correct.
 *
 * So the grants are derived from the deposit log, which is the same money, the
 * same customers and the same menu group: whoever may READ deposits may read
 * spot deposit intents, and whoever may APPROVE a deposit may work these doors.
 * They are kept as SEPARATE witnesses on purpose. `edit.spot.deposit.intent`
 * opens approve — a real credit against the pooled exchange account, recorded
 * as a pool-backing obligation — so a role that may look at the deposit queue
 * without deciding it must not acquire that power sideways from a console it
 * has never seen. One witness for both keys would do exactly that.
 *
 * Idempotent and order-independent: only absent (role, permission) pairs are
 * inserted, so re-running is a no-op and an operator who has already granted
 * these by hand in Admin -> Roles keeps what they set. It never revokes and
 * never widens a role beyond the deposit queue.
 */

/**
 * Each new key and the existing key whose holders define who should get it.
 * `view` is the console and its read routes; `edit` is approve, reject and
 * resweep.
 */
const GRANTS = [
  { key: "view.spot.deposit.intent", witness: "view.deposit" },
  { key: "edit.spot.deposit.intent", witness: "edit.deposit" },
];

const SELECT = (q) => ({ type: q.sequelize.QueryTypes.SELECT });

module.exports = {
  async up(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const permissions = await queryInterface.sequelize.query(
        "SELECT id, name FROM permission",
        { ...SELECT(queryInterface), transaction: t }
      );
      const idByName = new Map(permissions.map((p) => [p.name, p.id]));

      // Create either key if a very old install is missing it, so this seeder
      // does not depend on the ordering of the registry seeder.
      const missing = GRANTS.map((g) => g.key).filter((name) => !idByName.has(name));
      if (missing.length) {
        await queryInterface.bulkInsert(
          "permission",
          missing.map((name) => ({ name })),
          { transaction: t }
        );
        const refreshed = await queryInterface.sequelize.query(
          "SELECT id, name FROM permission",
          { ...SELECT(queryInterface), transaction: t }
        );
        refreshed.forEach((p) => idByName.set(p.name, p.id));
      }

      const rolePermissions = await queryInterface.sequelize.query(
        "SELECT roleId, permissionId FROM role_permission",
        { ...SELECT(queryInterface), transaction: t }
      );
      const held = new Set(rolePermissions.map((g) => `${g.roleId}:${g.permissionId}`));

      const added = [];
      for (const { key, witness } of GRANTS) {
        const permissionId = idByName.get(key);
        const witnessId = idByName.get(witness);
        // Nothing to derive from. Leaving this key alone is the safe answer:
        // guessing a role here could hand a money door to the wrong people.
        if (!permissionId || !witnessId) continue;

        const targetRoleIds = [
          ...new Set(
            rolePermissions.filter((g) => g.permissionId === witnessId).map((g) => g.roleId)
          ),
        ];
        for (const roleId of targetRoleIds) {
          const pair = `${roleId}:${permissionId}`;
          if (held.has(pair)) continue;
          held.add(pair);
          added.push({ roleId, permissionId });
        }
      }

      if (added.length) {
        await queryInterface.bulkInsert("role_permission", added, { transaction: t });
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  /**
   * Deliberately empty, like its siblings.
   *
   * Reversing this would revoke grants an operator may since have relied on,
   * and it cannot tell the ones it added from the ones somebody granted by hand
   * afterwards. Removing access is not something a rollback should guess at.
   */
  async down() {},
};
