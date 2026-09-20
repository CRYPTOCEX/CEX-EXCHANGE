/**
 * Pin `withdrawAutoApprove` from the legacy `withdrawApproval` row
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Two settings decide whether a spot withdrawal is paid out without an admin
 * looking at it, and until now BOTH had a switch on Admin -> System -> Settings
 * -> Wallet -> Security:
 *
 *     withdrawApproval      the legacy key. Its name reads backwards: the row
 *                           stores "true" to mean AUTO-approve, i.e. no approval
 *                           required. It was labelled "(Legacy)" on the panel.
 *     withdrawAutoApprove   the replacement, named for what it does.
 *
 * `api/finance/withdraw/spot/index.post.ts` resolves them in that order,
 * reversed: the new key if its row exists, else the legacy key, else manual.
 * The precedence is correct. The PANEL was the problem, because a switch with no
 * settings row renders its DEFAULT_SETTINGS value and both keys default to
 * "false" — so OFF on the new switch means either "an operator turned it off" or
 * "nobody ever wrote this row", and those two have OPPOSITE consequences when a
 * legacy row says "true".
 *
 * That is not hypothetical. It is what the screen looked like on the install
 * that prompted this script: legacy ON, new OFF, withdrawals auto-approving, and
 * the only switch bearing the plain name "Auto-Approve Withdrawals" reporting
 * that they were not.
 *
 * The legacy field has been removed from the panel, and the settings PUT now
 * mirrors any save of `withdrawAutoApprove` back into `withdrawApproval`. This
 * script is the other half: an install whose operator never opens that page
 * would otherwise keep a legacy row that no screen displays and the route still
 * obeys.
 *
 * WHAT IT WRITES
 * ---------------------------------------------------------------------------
 *     legacy row present, new row ABSENT   -> write new = legacy   (the change)
 *     both rows present, values DISAGREE   -> write legacy = new   (harmonise)
 *     both present and agreeing            -> nothing
 *     legacy absent                        -> nothing
 *
 * The first case is the one that matters, and note which way it copies:
 * `withdrawAutoApprove` is set to whatever the platform WAS ALREADY DOING. This
 * script never changes withdrawal behaviour — it makes the current behaviour
 * explicit and visible on the panel. An install auto-approving today keeps
 * auto-approving after it runs, with the switch finally showing ON; an install
 * requiring review keeps requiring it.
 *
 * The second case cannot arise from the UI any more (the mirror-write in the
 * settings PUT prevents it) but can arise from a row written by hand or by an
 * older build. The new key is authoritative there because it is the one the
 * route consults first and the only one an operator can now see.
 *
 * Idempotent: a second run finds the rows agreeing and does nothing.
 *
 * DRY-RUN by default (reports what it would do). Pass --apply to write.
 *   Report:  node scripts/migrate-withdraw-auto-approve.mjs
 *   Apply:   node scripts/migrate-withdraw-auto-approve.mjs --apply
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

const LEGACY_KEY = "withdrawApproval";
const NEW_KEY = "withdrawAutoApprove";

// Settings are TEXT. The route compares with `=== "true"`, so anything that is
// not exactly that string is OFF, and what we WRITE must be exactly one of these
// two — never a boolean, never "1"/"0".
const ON = "true";
const OFF = "false";

/** How the withdraw route reads a stored value. Mirrors it exactly. */
const isOn = (value) => value === ON;

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

/** Both rows, keyed by the exact key text stored in the table. */
async function readRows() {
  // `key` is a MySQL reserved word — must be backtick-quoted everywhere. The
  // settings PK collation is case-insensitive, so this matches a row stored as
  // "WithdrawApproval" too, and we write back through the casing we found.
  const rows = await sequelize.query(
    "SELECT `key`, `value` FROM `settings` WHERE `key` IN (?, ?)",
    { replacements: [LEGACY_KEY, NEW_KEY], type: QueryTypes.SELECT }
  );
  const byLower = new Map(rows.map((r) => [r.key.toLowerCase(), r]));
  return {
    legacy: byLower.get(LEGACY_KEY.toLowerCase()) ?? null,
    fresh: byLower.get(NEW_KEY.toLowerCase()) ?? null,
  };
}

async function main() {
  console.log("=".repeat(72));
  console.log(`Migrate withdrawApproval -> withdrawAutoApprove  (${APPLY ? "APPLY" : "DRY-RUN"})`);
  console.log("=".repeat(72) + "\n");

  await sequelize.authenticate();

  // Confirm the table exists before drawing any conclusion from an empty read.
  // A missing table would otherwise throw and be indistinguishable from "no
  // rows", which is the branch that writes nothing.
  const dbName = sequelize.config.database;
  const tableRows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'settings'`,
    { replacements: [dbName], type: QueryTypes.SELECT }
  );
  if (!tableRows.length) {
    console.error(`ERROR: table \`settings\` not found in schema \`${dbName}\`. Aborting.`);
    return;
  }

  const { legacy, fresh } = await readRows();

  const show = (label, row) =>
    console.log(
      `  ${label.padEnd(20)} ${row ? JSON.stringify(row.value) : "(no row)"}`
    );
  console.log("Current rows:");
  show(LEGACY_KEY, legacy);
  show(NEW_KEY, fresh);

  // What the route does RIGHT NOW, stated before anything is written so the
  // report can be checked against the platform's observed behaviour.
  const effective = fresh ? isOn(fresh.value) : legacy ? isOn(legacy.value) : false;
  console.log(
    `\nEffective behaviour today: withdrawals are ${
      effective ? "AUTO-APPROVED" : "held for manual review"
    }.`
  );

  if (!legacy) {
    console.log(
      `\nNo \`${LEGACY_KEY}\` row — nothing to migrate. The new key is already the\n` +
        "only thing the route can resolve."
    );
    console.log("\n" + "=".repeat(72));
    return;
  }

  let targetKey;
  let targetValue;
  let reason;

  if (!fresh) {
    targetKey = NEW_KEY;
    targetValue = isOn(legacy.value) ? ON : OFF;
    reason =
      `\`${LEGACY_KEY}\` = ${JSON.stringify(legacy.value)} was deciding this install's behaviour\n` +
      "  through a row no screen displays. Copying it forward changes nothing about\n" +
      `  what happens to a withdrawal — it makes the panel show the truth (${
        targetValue === ON ? "ON" : "OFF"
      }).`;
  } else if (isOn(legacy.value) !== isOn(fresh.value)) {
    targetKey = LEGACY_KEY;
    targetValue = isOn(fresh.value) ? ON : OFF;
    reason =
      "  The two rows DISAGREE. The new key already wins at the route, so this only\n" +
      "  removes a contradiction that a future reader could resolve the other way.";
  } else {
    console.log(
      "\nBoth rows present and in agreement — nothing to do (idempotent)."
    );
    console.log("\n" + "=".repeat(72));
    return;
  }

  console.log(`\nWould write \`${targetKey}\` = "${targetValue}".`);
  console.log(reason);

  if (!APPLY) {
    console.log("\nDRY-RUN — no changes written. Re-run with --apply to write.");
    console.log("=".repeat(72));
    return;
  }

  // Write through the casing already stored, so a row saved as "WithdrawApproval"
  // is updated rather than shadowed by a second one.
  const storedKey =
    targetKey === NEW_KEY ? (fresh ? fresh.key : NEW_KEY) : legacy.key;

  await sequelize.query(
    "INSERT INTO `settings` (`key`, `value`) VALUES (?, ?) " +
      "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    { replacements: [storedKey, targetValue], type: QueryTypes.INSERT }
  );

  const after = await readRows();
  console.log("\nRows now:");
  show(LEGACY_KEY, after.legacy);
  show(NEW_KEY, after.fresh);

  const settled = after.fresh
    ? isOn(after.fresh.value)
    : after.legacy
      ? isOn(after.legacy.value)
      : false;

  if (settled !== effective) {
    // Loud, because the whole point of this script is that it does not change
    // behaviour. If it did, the operator needs to know before their users do.
    console.error(
      `\nERROR: effective behaviour CHANGED (${effective ? "auto" : "manual"} -> ${
        settled ? "auto" : "manual"
      }). Review the rows above.`
    );
  } else {
    console.log(
      `\n[OK] Behaviour unchanged (${settled ? "auto-approve" : "manual review"}), and both rows now say so.`
    );
    console.log(
      "\nIMPORTANT: restart the backend so the settings cache picks up the new value."
    );
  }
  console.log("=".repeat(72));
}

main()
  .catch((e) => console.error("Failed to migrate withdrawAutoApprove:", e))
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
  });
