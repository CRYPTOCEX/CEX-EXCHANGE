/**
 * Backfill `verifyEmailStatus` for EXISTING installs  (CORE-AUTH-11)
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Seven backend readers used to spell the email-verification switch as
 *
 *     (await cacheManager.getSetting("verifyEmailStatus")) === "true"
 *
 * so an ABSENT row meant OFF — while the admin panel, which renders from
 * `DEFAULT_SETTINGS.verifyEmailStatus = "true"`, showed the switch ON. Nothing
 * seeds the `settings` table (`initial.sql` issues zero INSERTs into it) and the
 * admin save is changed-keys-only, so on a stock install that row never existed
 * and the two sides disagreed for the life of the install.
 *
 * All seven readers now spell `getSettingBool("verifyEmailStatus", true)`:
 * absent -> ON, matching the panel. That is the intended product — and it is a
 * BEHAVIOUR CHANGE for anyone upgrading. Without this script, an install that has
 * been running for a year with no row would, on the first restart after the
 * upgrade, start demanding a verification code from every new signup and (via
 * the login gate) from every existing unverified account. If their mail
 * transport is not configured, that is a lockout.
 *
 * THE HEURISTIC, AND WHY IT IS THE RIGHT ONE
 * ---------------------------------------------------------------------------
 *     no `verifyEmailStatus` row  AND  `SELECT COUNT(*) FROM user` > 0
 *         -> write an explicit "false"
 *
 * "Has users" is the only evidence available here that an install is ALREADY
 * RUNNING rather than being set up. An install with accounts on it has a
 * behaviour its operator and its users depend on, and this pins that behaviour
 * by making it explicit instead of implicit — the row now SAYS what the platform
 * was already doing, and the admin panel will show it as OFF, which is the truth.
 *
 * A FRESH INSTALL (zero users) DELIBERATELY GETS NO ROW, and therefore the new
 * `true` default. That is correct and harmless: nobody has signed up yet, so no
 * one can be locked out, and the operator lands on the intended product with the
 * panel and the server finally agreeing.
 *
 * An install that ALREADY has the row is never touched, in either direction —
 * an operator's saved choice outranks anything this script could infer.
 *
 * BEFORE YOU RUN IT: check Admin -> System Health. The Email Service probe now
 * reports MAIL_DISABLED and stops claiming "sent" for a message it only queued,
 * so it is worth reading before an install starts depending on mail.
 *
 * Idempotent: the row is only inserted when absent (SELECT then INSERT IGNORE),
 * so a second run is a no-op and never overwrites an admin-tuned value.
 *
 * DRY-RUN by default (reports what it would do). Pass --apply to write.
 *   Report:  node scripts/backfill-verify-email-status.mjs
 *   Apply:   node scripts/backfill-verify-email-status.mjs --apply
 *
 * After --apply, restart the backend so the settings cache is refreshed.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

const SETTING_KEY = "verifyEmailStatus";
// The value that preserves an existing install's behaviour. Settings are TEXT:
// OFF is the STRING "false", never a boolean and never "0".
const PRESERVING_VALUE = "false";

const sequelize = new Sequelize(
  process.env.DB_NAME || "platform",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: false,
  }
);

async function main() {
  console.log("=".repeat(64));
  console.log(`Backfill verifyEmailStatus  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(64) + "\n");

  await sequelize.authenticate();

  // Guard: confirm both tables exist before drawing any conclusion from them.
  // A missing `user` table would otherwise throw and be indistinguishable from
  // "zero users", which is the branch that writes nothing.
  const dbName = sequelize.config.database;
  const tableRows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('settings', 'user')`,
    { replacements: [dbName], type: QueryTypes.SELECT }
  );
  const present = new Set(tableRows.map((r) => r.TABLE_NAME));
  for (const table of ["settings", "user"]) {
    if (!present.has(table)) {
      console.error(
        `ERROR: table \`${table}\` not found in schema \`${dbName}\`. Aborting.`
      );
      return;
    }
  }

  // `key` is a MySQL reserved word — must be backtick-quoted everywhere.
  const existing = await sequelize.query(
    "SELECT `key`, `value` FROM `settings` WHERE `key` = ?",
    { replacements: [SETTING_KEY], type: QueryTypes.SELECT }
  );

  if (existing.length) {
    console.log(
      `Setting \`${SETTING_KEY}\` already exists with value = ${JSON.stringify(existing[0].value)}`
    );
    console.log(
      "Nothing to do — an operator's saved choice is never overwritten (idempotent)."
    );
    console.log("\n" + "=".repeat(64));
    return;
  }

  const [{ count: userCount }] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM `user`",
    { type: QueryTypes.SELECT }
  );
  const users = Number(userCount);

  console.log(`Setting \`${SETTING_KEY}\` is ABSENT.`);
  console.log(`Accounts on this install: ${users}\n`);

  if (users === 0) {
    console.log(
      "FRESH INSTALL (no accounts) — leaving the row absent on purpose, so the\n" +
        "platform default applies and email verification is ON, matching the switch\n" +
        "the admin panel already shows. Nobody can be locked out of an install with\n" +
        "no users."
    );
    console.log("\n" + "=".repeat(64));
    return;
  }

  console.log(
    `EXISTING INSTALL — would write \`${SETTING_KEY}\` = "${PRESERVING_VALUE}" so behaviour\n` +
      "does not change on upgrade. This install has been running with email\n" +
      "verification effectively OFF (an absent row used to read as OFF), and this\n" +
      "makes that explicit rather than flipping it. Turn it on from Admin ->\n" +
      "System -> Settings once you have confirmed mail actually delivers."
  );

  if (!APPLY) {
    console.log("\nDRY-RUN — no changes written. Re-run with --apply to insert.");
    console.log("=".repeat(64));
    return;
  }

  // INSERT IGNORE keeps this safe even against a concurrent inserter.
  await sequelize.query(
    "INSERT IGNORE INTO `settings` (`key`, `value`) VALUES (?, ?)",
    { replacements: [SETTING_KEY, PRESERVING_VALUE], type: QueryTypes.INSERT }
  );

  const verify = await sequelize.query(
    "SELECT `key`, `value` FROM `settings` WHERE `key` = ?",
    { replacements: [SETTING_KEY], type: QueryTypes.SELECT }
  );

  if (verify.length) {
    console.log(`\n[INSERTED] \`${SETTING_KEY}\` = ${JSON.stringify(verify[0].value)}`);
    console.log(
      "\nIMPORTANT: restart the backend so the settings cache picks up the new value."
    );
  } else {
    console.error(`\nERROR: insert did not persist \`${SETTING_KEY}\`.`);
  }
  console.log("=".repeat(64));
}

main()
  .catch((e) => console.error("Failed to backfill verifyEmailStatus:", e))
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
