"use strict";

/**
 * Aligns the FOUR places a permission key lives, WITHOUT dropping the grants
 * roles already hold.
 *
 * Every entry below fixes a case where two of those places demanded different
 * keys for the same operation. Both halves were already seeded, so nothing was
 * ungrantable — but nothing worked on one grant either, and the failure was
 * silent in both directions:
 *
 *   - `store/index.ts` only calls `fetchData()` when `access` AND `view` both
 *     pass, so a table whose `view` key no route checked rendered its chrome and
 *     never loaded a row. No error, no 403 — just an empty table forever.
 *   - A mutation key that disagreed with its route showed the button to people
 *     the route rejects, and hid it from people it would have accepted.
 *
 * The corrections went in two directions, decided per family by which spelling
 * `config/menu.ts`, the co-located `permission.ts` and the seeder already
 * agreed on:
 *
 *   - Routes moved onto contract verbs where they sat on a screen gate — a GET
 *     is `view.`, a PUT or status-flipping POST is `edit.`, a DEL is `delete.`.
 *     That covers all 23 Copy Trading routes, the NFT admin lists, support
 *     tickets, announcements, geo restriction and the staking position writes.
 *   - DataTable props moved onto the key the menu already grants where the
 *     PROP was the odd one out: Revenue Analytics (`*.profit` ->
 *     `*.admin.profit`), Investment Analytics (`*.investment.history` ->
 *     `*.investment`), Homepage Sliders (`access.slider` ->
 *     `access.content.slider`) and System Announcements (`access.announcement`
 *     -> `access.system.announcement`).
 *
 * `keep: true` marks a key that is still part of the contract and must survive:
 * it lost SOME routes to a finer key, so its holders need the finer key too,
 * but it still gates a screen or other routes of its own. `access.nft` is the
 * clearest case — it still guards activity, analytics, review and stats, so it
 * stays, but the four lists that moved to `view.nft.*` have to be carried over
 * or a role that could see them today stops being able to.
 *
 * Same mechanics as `20260801000001-permission-key-rename.js`: idempotent,
 * order-independent, and a no-op once the old keys are gone.
 */

// old key -> { to: [replacements], keep: true if the old key is still in use }
const RENAMES = {
  // --- Revenue Analytics: the table asked for a family with no routes -------
  "access.profit": { to: ["access.admin.profit"] },
  "view.profit": { to: ["view.admin.profit"] },
  "create.profit": { to: ["create.admin.profit"] },
  "edit.profit": { to: ["edit.admin.profit"] },
  "delete.profit": { to: ["delete.admin.profit"] },

  // --- Investment Analytics: likewise, `*.investment` is what routes use ----
  "access.investment.history": { to: ["access.investment"] },
  "view.investment.history": { to: ["view.investment"] },
  "create.investment.history": { to: ["create.investment"] },
  "edit.investment.history": { to: ["edit.investment"] },
  "delete.investment.history": { to: ["delete.investment"] },

  // --- Screen gates the menu spells one way and the table spelled another ---
  "access.slider": { to: ["access.content.slider"] },
  // The table demanded `access.announcement` while the menu granted
  // `access.system.announcement`, so the entry was reachable and the table was
  // blank. The list GET also moved off the screen gate onto `view.`.
  "access.announcement": { to: ["access.system.announcement", "view.announcement"] },

  // --- Non-contract verb: `update.` is not one of the six ------------------
  "update.binary.market": { to: ["edit.binary.market"] },

  // --- The role list GET disagreed with its own [id] GET -------------------
  "view.crm.role": { to: ["view.role"] },

  // --- Staking position writes sat on a screen-shaped key ------------------
  "access.staking.management": { to: ["edit.staking.position"] },

  // --- NFT: the addon-wide keys kept some routes and lost others -----------
  "create.nft": { to: ["create.nft.category"] },
  "access.nft": {
    keep: true,
    to: [
      "view.nft.auction",
      "view.nft.category",
      "view.nft.creator",
      "view.nft.offer",
    ],
  },
  "access.nft.token": { keep: true, to: ["view.nft.token"] },
  "access.nft.sale": { keep: true, to: ["view.nft.sale"] },
  "access.nft.listing": { keep: true, to: ["view.nft.listing"] },
  "access.nft.collection": { keep: true, to: ["view.nft.collection"] },
  "edit.nft": { keep: true, to: ["edit.nft.category"] },
  "delete.nft": {
    keep: true,
    to: ["delete.nft.category", "delete.nft.collection"],
  },

  // --- Copy Trading: all 23 admin routes shared the screen gate ------------
  "access.copy_trading": {
    keep: true,
    to: ["view.copy_trading", "edit.copy_trading", "delete.copy_trading"],
  },

  // --- Support tickets and geo restriction: list GETs moved to `view.` -----
  "access.support.ticket": { keep: true, to: ["view.support.ticket"] },
  "access.geo.restriction": { keep: true, to: ["view.geo.restriction"] },

  // --- The deposit-log DEL now matches its own [id] sibling ----------------
  "delete.transaction": { keep: true, to: ["delete.deposit"] },
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
        `[permission-gate-alignment] added ${toInsert.length} keys, ` +
          `carried ${added.length} grants, retired ${retired.length} keys`
      );
    } catch (error) {
      await t.rollback();
      console.error("[permission-gate-alignment] failed:", error);
      throw error;
    }
  },

  // Intentionally a no-op, for the same reason as the seeder before it:
  // reversing would have to guess which of the new fine-grained keys a role
  // held before the split, and getting that wrong hands out access nobody
  // granted.
  async down() {},
};
