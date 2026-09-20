"use strict";

/**
 * Grants the Pool Backing keys to the roles that already run the deposit and
 * withdrawal queues.
 *
 * ---------------------------------------------------------------------------
 * WHY A SECOND SEEDER
 * ---------------------------------------------------------------------------
 * `20240402234643-permissions.js` CREATES `view.pool.backing`,
 * `edit.pool.backing` and `manage.pool.backing`, so every drift gate passes.
 * But that seeder is the registry only — it grants nothing. On an EXISTING
 * install the console at Admin -> Finance -> Pool Backing therefore exists and
 * nobody can open it: the routes 403, the menu entry filters itself out, and
 * only Super Admin (who bypasses the gate BY NAME while holding zero
 * permission rows) sees a working page. Whoever tests the upgrade as the owner
 * sees it work; every configured role sees nothing.
 *
 * Pool Backing makes that worse than the Spot Deposit Intent case
 * (`20260904000001-spot-deposit-intent-permissions.js`), because the
 * reconciliation ALERTS — drift, holdings unknown, a parked settlement, a USD
 * gap — are addressed to admins who hold `view.pool.backing`. A key nobody
 * holds is an alert nobody but Super Admin receives, and the whole point of
 * the reconciliation is that somebody notices.
 *
 * ---------------------------------------------------------------------------
 * WHICH WITNESSES, AND WHY THE LOSS DOORS ARE NOT DERIVED
 * ---------------------------------------------------------------------------
 * The grants are derived from keys the operator already chose by hand, never
 * from a role NAME (an install that renamed or split "Admin" would silently
 * get nothing):
 *
 *   view.pool.backing  <- view.deposit
 *     The console and its read routes show the platform's liabilities against
 *     its holdings. Customer deposits ARE those liabilities, and the two
 *     screens sit in the same Finance menu; whoever may read the deposit log
 *     may read what backs it.
 *
 *   edit.pool.backing  <- edit.deposit AND edit.withdraw (both required)
 *     Run reconciliation, record an external movement, settle now, convert,
 *     acknowledge drift, attach a hash, mark arrived, set a per-currency cap.
 *     Settle now and convert move the platform's own coins between its own
 *     pools; record external closes ledger rows on the operator's word. A role
 *     that already decides customer money in BOTH directions — credits a
 *     deposit, releases a withdrawal from the same exchange account — already
 *     holds more than this. A role that decides only one direction does not
 *     acquire the other sideways from a console it has never seen, which is
 *     why both witnesses must be held rather than either.
 *
 *   manage.pool.backing  <- nothing
 *     Waive (recognise an obligation as a loss) and mark failed (reopen a
 *     settlement's obligations so they are shipped or bought again). These
 *     are rare, deliberate owner actions with no existing key of the same
 *     weight to derive from; a Super Admin holds them by name and grants them
 *     by hand under Admin -> Roles. Guessing here would hand loss recognition
 *     to whoever runs a queue.
 *
 * Idempotent and order-independent: only absent (role, permission) pairs are
 * inserted, so re-running is a no-op and an operator who has already granted
 * these by hand keeps what they set. It never revokes and never widens a role
 * beyond what its witnesses already say about it.
 */

/**
 * Each key and the existing keys whose holders define who should get it. A
 * role must hold EVERY witness listed to receive the key.
 */
const GRANTS = [
  { key: "view.pool.backing", witnesses: ["view.deposit"] },
  { key: "edit.pool.backing", witnesses: ["edit.deposit", "edit.withdraw"] },
];

/** Keys this seeder creates if a very old install lacks them, but never grants. */
const REGISTRY_ONLY = ["manage.pool.backing"];

const SELECT = (q) => ({ type: q.sequelize.QueryTypes.SELECT });

module.exports = {
  GRANTS,
  REGISTRY_ONLY,

  async up(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const permissions = await queryInterface.sequelize.query(
        "SELECT id, name FROM permission",
        { ...SELECT(queryInterface), transaction: t }
      );
      const idByName = new Map(permissions.map((p) => [p.name, p.id]));

      // Create any of the three keys a very old install is missing, so this
      // seeder does not depend on the ordering of the registry seeder.
      const wanted = [...GRANTS.map((g) => g.key), ...REGISTRY_ONLY];
      const missing = wanted.filter((name) => !idByName.has(name));
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
      for (const { key, witnesses } of GRANTS) {
        const permissionId = idByName.get(key);
        const witnessIds = witnesses.map((w) => idByName.get(w));
        // Nothing to derive from. Leaving this key alone is the safe answer:
        // guessing a role here could hand a money door to the wrong people.
        if (!permissionId || witnessIds.some((id) => !id)) continue;

        const roleIds = new Set(
          rolePermissions.filter((g) => g.permissionId === witnessIds[0]).map((g) => g.roleId)
        );
        for (const witnessId of witnessIds.slice(1)) {
          const holders = new Set(
            rolePermissions.filter((g) => g.permissionId === witnessId).map((g) => g.roleId)
          );
          for (const roleId of [...roleIds]) {
            if (!holders.has(roleId)) roleIds.delete(roleId);
          }
        }

        for (const roleId of roleIds) {
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
