"use strict";

/**
 * `ai_market_maker.priceMode`: add the MIRROR member to the ENUM.
 *
 * WHAT MIRROR IS FOR
 * ------------------
 * The three existing modes all generate the market's price and differ only in how hard
 * something leans on that invented series. FOLLOW_EXTERNAL is a lean, not tracking: its
 * tether closes half of any gap to the reference in about 33 hours at the shipped
 * correlation strength, while the market's own diffusion wanders roughly +/-1.5% a day. No
 * mode anywhere in the engine set the quote centre — or the published price — to the
 * reference itself, which is why an operator who selected "Follow exchange" saw a chart
 * that never tracked the exchange.
 *
 * MIRROR publishes the reference AS the price and quotes real pool liquidity around it.
 * See models/ext/ai/market-maker/aiMarketMaker.ts for the behaviour it selects.
 *
 * WHY THE AUTO-SYNC WILL NOT DO THIS
 * ----------------------------------
 * `src/db.ts` runs a diff-based `sync({alter:true})` that fingerprints columns from the
 * MODEL DEFINITION into `.sync-hash` and compares definition against definition, never
 * against what MySQL actually holds. The fingerprint DOES change here — the enum member
 * list is part of it — so on many installs the sync would in fact issue the ALTER. This
 * seeder exists because that is not true on all of them: an install whose manifest is
 * rebuilt, or which runs with sync disabled, or which was created from `initial.sql` and
 * has never had a hash written, would silently keep a three-member enum. Writing MIRROR
 * into a column that does not accept it fails with a data-truncation error at the moment
 * an operator saves the mode — not at boot, where somebody would see it.
 *
 * `pnpm updator` runs `db:seed:all`, so this is the path that actually reaches installs.
 *
 * ORDER MATTERS, AND IT IS NOT COSMETIC
 * --------------------------------------
 * MySQL stores an ENUM as the ORDINAL of its member, not as text. The new member is
 * therefore APPENDED and the three existing ones are restated in their original order; a
 * list written in any other order would rewrite the meaning of every row already stored —
 * a market saved as HYBRID would read back as whatever now sat third.
 *
 * Idempotent: the column type is read first and the ALTER is skipped when MIRROR is
 * already present. Safe on a live database — widening an ENUM cannot invalidate an
 * existing row, and no row is written here.
 */

const TABLE = "ai_market_maker";
const COLUMN = "priceMode";

/** Appended, never re-ordered. See the header. */
const MEMBERS = ["AUTONOMOUS", "FOLLOW_EXTERNAL", "HYBRID", "MIRROR"];

const quoteIdent = (name) => `\`${String(name).replace(/`/g, "``")}\``;

const enumDefinition = () =>
  `enum(${MEMBERS.map((m) => `'${m}'`).join(",")}) NOT NULL DEFAULT 'AUTONOMOUS'`;

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const database = sequelize.getDatabaseName();
    const select = (sql, replacements) =>
      sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

    // An install without the AI market maker addon has nothing to change and must not be
    // reported as a failure: `pnpm updator` runs db:seed:all, so this must never be the
    // thing that fails a seed run.
    try {
      const [column] = await select(
        `SELECT COLUMN_TYPE
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = :database
            AND TABLE_NAME = :table
            AND COLUMN_NAME = :column`,
        { database, table: TABLE, column: COLUMN }
      );

      if (!column) {
        console.log(
          `[ai-mm-mirror-price-mode] ${TABLE}.${COLUMN} is not present — skipping`
        );
        return;
      }

      const current = String(column.COLUMN_TYPE || "");
      if (/'MIRROR'/i.test(current)) {
        console.log(
          `[ai-mm-mirror-price-mode] ${TABLE}.${COLUMN} already accepts MIRROR — nothing to do`
        );
        return;
      }

      /*
       * REFUSE RATHER THAN GUESS.
       *
       * The ALTER below RESTATES the whole member list, so running it against a column
       * whose members are not the three this migration was written for would silently
       * rewrite what every stored ordinal means. A column that has diverged is a case for
       * a human, not for a seeder that runs unattended on every update.
       */
      const existing = (current.match(/'([^']*)'/g) || []).map((m) => m.slice(1, -1));
      const expected = MEMBERS.slice(0, 3);
      const matches =
        existing.length === expected.length &&
        existing.every((m, i) => m === expected[i]);

      if (!matches) {
        console.warn(
          `[ai-mm-mirror-price-mode] ${TABLE}.${COLUMN} is ${current}, which is not the ` +
            `three-member enum this migration expects (${expected.join(", ")}). ` +
            `Skipping rather than rewriting the ordinals of existing rows — add MIRROR by hand.`
        );
        return;
      }

      await sequelize.query(
        `ALTER TABLE ${quoteIdent(TABLE)} MODIFY ${quoteIdent(COLUMN)} ${enumDefinition()}`
      );

      console.log(
        `[ai-mm-mirror-price-mode] ${TABLE}.${COLUMN} now accepts MIRROR`
      );
    } catch (error) {
      console.warn(
        `[ai-mm-mirror-price-mode] skipped: ${error?.message ?? error}`
      );
    }
  },

  /*
   * NOT REVERSIBLE, DELIBERATELY.
   *
   * Narrowing the enum back would silently rewrite any row an operator had saved as
   * MIRROR — MySQL turns a value outside the member list into the empty string, and that
   * market would then boot into a mode nothing in the engine recognises. A migration that
   * can lose an operator's configuration is worse than one that cannot be undone.
   */
  async down() {
    console.log(
      "[ai-mm-mirror-price-mode] not reversible — narrowing the enum would blank any row saved as MIRROR"
    );
  },
};
