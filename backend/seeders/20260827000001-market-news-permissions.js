"use strict";

/**
 * Grants the Market News keys to the roles that already administer system
 * content.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS WRONG
 * ---------------------------------------------------------------------------
 * `20240402234643-permissions.js` CREATES the five `*.market.news` keys, so
 * every drift check passes: the routes name keys that exist, the DataTable
 * props match the routes, the menu agrees with the co-located `permission.ts`.
 * Nothing was ungrantable.
 *
 * But no seeder ever GRANTED them to a role. Measured on the development
 * install, 2026-08-27:
 *
 *   perm                  roles
 *   access.market.news    NULL
 *   view.market.news      NULL
 *   create.market.news    NULL
 *   edit.market.news      NULL
 *   delete.market.news    NULL
 *
 * Admin held 188 other keys, including `access.system.announcement` and
 * `view.system.announcement` — the screen that sits directly above Market News
 * in the same menu group. So Admin could administer announcements and could
 * not open Market News at all, and nothing anywhere said why: `rolesGate`
 * 403s, the menu entry filters itself out, and the screen simply is not there.
 * Only Super Admin could reach it, because Super Admin bypasses the gate BY
 * NAME and holds zero permission rows of its own.
 *
 * That was true before the News Providers console was added and is not caused
 * by it — the new screen reuses this same key family deliberately, so fixing
 * the grant fixes both screens at once.
 *
 * ---------------------------------------------------------------------------
 * WHY IT DERIVES THE TARGET ROLES INSTEAD OF NAMING "Admin"
 * ---------------------------------------------------------------------------
 * A seeder that hardcodes `WHERE role.name = 'Admin'` does nothing on an
 * install whose operator renamed the role, split it, or built their own — and
 * does it silently, which is the failure this seeder exists to correct in the
 * first place.
 *
 * `access.system.announcement` is used as the witness because it is the
 * closest sibling: same menu group, same kind of content, same blast radius.
 * Whoever may post a platform announcement may curate the news feed the
 * trading terminal shows. If a role does not hold the witness, it does not get
 * these keys — the seeder never widens anyone's reach beyond system content.
 *
 * Idempotent and order-independent: it inserts only the (role, permission)
 * pairs that are absent, so re-running it is a no-op, and an operator who has
 * already granted these by hand in Admin -> Roles keeps exactly what they set.
 * It never revokes.
 */

/** The whole family. A role that may open the screen must also be able to read it. */
const MARKET_NEWS_KEYS = [
  "access.market.news",
  "view.market.news",
  "create.market.news",
  "edit.market.news",
  "delete.market.news",
];

/**
 * The key whose holders define "administers system content on this install".
 *
 * Deliberately a screen gate rather than `access.admin`: `access.admin` opens
 * the admin shell and is held by roles that are not meant to curate content.
 */
const WITNESS_KEY = "access.system.announcement";

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

      // Create any of the five that a very old install is missing, so this
      // seeder does not depend on the ordering of the registry seeder.
      const missing = MARKET_NEWS_KEYS.filter((name) => !idByName.has(name));
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

      const witnessId = idByName.get(WITNESS_KEY);
      if (!witnessId) {
        // Nothing to derive from. Leaving the grants alone is the safe answer:
        // guessing a role here could hand news curation to the wrong people.
        await t.commit();
        return;
      }

      const grants = await queryInterface.sequelize.query(
        "SELECT roleId, permissionId FROM role_permission",
        { ...SELECT(queryInterface), transaction: t }
      );
      const held = new Set(grants.map((g) => `${g.roleId}:${g.permissionId}`));

      const targetRoleIds = [
        ...new Set(
          grants.filter((g) => g.permissionId === witnessId).map((g) => g.roleId)
        ),
      ];

      const added = [];
      for (const roleId of targetRoleIds) {
        for (const name of MARKET_NEWS_KEYS) {
          const permissionId = idByName.get(name);
          if (!permissionId) continue;
          const pair = `${roleId}:${permissionId}`;
          if (held.has(pair)) continue;
          held.add(pair);
          added.push({ roleId, permissionId });
        }
      }

      if (added.length) {
        await queryInterface.bulkInsert("role_permission", added, {
          transaction: t,
        });
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
   * and it cannot tell the ones it added from the ones somebody granted by
   * hand afterwards. Removing access is not something a rollback should guess
   * at.
   */
  async down() {},
};
