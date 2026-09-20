"use strict";

/**
 * Removes the notification rows addressed to the platform's own accounts.
 *
 * ---------------------------------------------------------------------------
 * WHY
 * ---------------------------------------------------------------------------
 * `backend/src/utils/system-accounts.ts` is the registry of accounts the
 * platform operates for itself: the pool-backing treasury and the AI
 * market-maker pool. Since Core 6.7.6 no door treats them as customers —
 * `NotificationService.send` refuses them, the mailer drops them, the deposit
 * and transfer notifiers skip them. Before that, every fill the AI pool made
 * and every settlement the treasury received wrote a notification row for an
 * account nobody can sign in to. Those rows are dead weight in the table the
 * bell icon pages through, and on a busy market maker there are a lot of them.
 *
 * The ids are copied here rather than imported because seeders are CommonJS
 * and run before the TypeScript build exists. A unit test pins this list to
 * the registry so the two cannot drift apart.
 *
 * Idempotent: a second run finds nothing and deletes nothing. It touches no
 * other table — wallet, ledger and audit rows for these accounts are the
 * platform's own books and stay.
 */

const SYSTEM_ACCOUNT_IDS = [
  "b0000000-0000-4000-b000-000000000001", // pool-backing treasury
  "a1000000-0000-4000-a000-000000000001", // AI market maker pool
];

module.exports = {
  SYSTEM_ACCOUNT_IDS,

  async up(queryInterface) {
    await queryInterface.bulkDelete("notification", { userId: SYSTEM_ACCOUNT_IDS });
  },

  /** Nothing to restore: the rows were never readable by anyone. */
  async down() {},
};
