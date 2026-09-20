"use strict";

/**
 * Repairs the FOREX_INVESTMENT affiliate condition, which shipped as a 100%
 * payout and shipped ACTIVE.
 *
 * `20240402234806-rewardConditions.js` seeded it as:
 *
 *     reward: 100, rewardType: "FIXED", minAmount: 100, status: true
 *
 * which reads: when a referred user makes a forex investment of at least 100,
 * pay their referrer 100 — the whole qualifying investment — out of the
 * operator's own balance sheet, on every such investment, with nobody having
 * opted in.
 *
 * It is the only FIXED reward among the thirty-seven seeded conditions. Every
 * other one that ships active is a small percentage (0.1 to 15), including this
 * condition's own sibling FOREX_PROFIT at 2%. The shape of the mistake is a
 * `minAmount` copied into `reward` with the type left behind.
 *
 * The condition seeder is additive — it skips by `name` — so correcting it there
 * only helps NEW installs. Every install seeded before that change still holds
 * the 100 FIXED row, which is why this exists.
 *
 * ---------------------------------------------------------------------------
 * IT WILL NOT TOUCH A RATE AN OPERATOR CHOSE
 * ---------------------------------------------------------------------------
 * The WHERE clause matches the exact untouched seeded values — name, type,
 * reward 100, rewardType FIXED. An operator who has already looked at this
 * screen and set their own figure has, by definition, changed at least one of
 * them, and this seeder passes their row by. That is the whole design: the
 * repair is for people who inherited a number, not for people who picked one.
 *
 * Idempotent: once repaired, the WHERE matches nothing and the seeder reports
 * zero rows on every subsequent run.
 */

module.exports = {
  async up(queryInterface) {
    // `pnpm updator` runs `db:seed:all`, so this executes on every install that
    // updates — which means it must never be the thing that fails a seed run.
    // The sibling condition seeder guards the same way.
    try {
      await queryInterface.describeTable("mlm_referral_condition");
    } catch {
      console.log(
        "[forex-investment-reward-repair] mlm_referral_condition is not present — skipping"
      );
      return;
    }

    const t = await queryInterface.sequelize.transaction();
    try {
      // Report before changing, so an operator reading deploy output can see
      // whether their install was one of the affected ones.
      const [rows] = await queryInterface.sequelize.query(
        `SELECT id, reward, rewardType, minAmount, status
           FROM mlm_referral_condition
          WHERE name = 'FOREX_INVESTMENT'
            AND type = 'FOREX_INVESTMENT'
            AND rewardType = 'FIXED'
            AND reward = 100`,
        { transaction: t }
      );

      if (!rows.length) {
        await t.commit();
        console.log(
          "[forex-investment-reward-repair] nothing to repair — the row is " +
            "absent, already corrected, or carries an operator's own figure"
        );
        return;
      }

      const wasActive = rows.some((r) => r.status === true || r.status === 1);

      await queryInterface.sequelize.query(
        `UPDATE mlm_referral_condition
            SET reward = 5, rewardType = 'PERCENTAGE'
          WHERE name = 'FOREX_INVESTMENT'
            AND type = 'FOREX_INVESTMENT'
            AND rewardType = 'FIXED'
            AND reward = 100`,
        { transaction: t }
      );

      await t.commit();
      console.log(
        `[forex-investment-reward-repair] repaired ${rows.length} row(s): ` +
          `100 FIXED -> 5 PERCENTAGE, qualifying minimum unchanged.` +
          (wasActive
            ? " THE CONDITION WAS ACTIVE, so referred forex investments have been" +
              " paying a referrer the entire qualifying amount. Review" +
              " Admin -> Affiliate -> Rewards for what has already been claimed," +
              " and set the rate you actually want on the Conditions screen."
            : " The condition was inactive, so nothing had been paid out.")
      );
    } catch (error) {
      await t.rollback();
      console.error("[forex-investment-reward-repair] failed:", error);
      throw error;
    }
  },

  // Intentionally a no-op. Reversing means restoring a 100% payout, and no
  // migration should be able to do that by running backwards.
  async down() {},
};
