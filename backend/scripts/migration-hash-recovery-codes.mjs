/**
 * RECOVERY-CODES — hash the plaintext 2FA recovery codes in `two_factor`.
 *
 * WHAT IS WRONG
 * -------------
 * `two_factor.recoveryCodes` holds a JSON array of the twelve recovery codes
 * exactly as they were shown to the user:
 *
 *     ["A1B2-C3D4-E5F6", "0F9E-8D7C-6B5A", ...]
 *
 * Each one is, on its own, a COMPLETE second-factor bypass. `/api/auth/otp/login`
 * accepts one INSTEAD of the TOTP, and the password-change, withdrawal and P2P
 * step-ups accept one too. So a single
 *
 *     SELECT userId, recoveryCodes FROM two_factor;
 *
 * hands the reader a working second factor for every 2FA-protected account on
 * the install — from a read-only backup, a reporting replica, a support export
 * or one SQL injection. The users it protects cannot tell and have nothing to
 * rotate.
 *
 * The `secret` column in this same row has always been encrypted. The recovery
 * codes sat beside it in the clear, and they are the stronger credential of the
 * two: the secret still needs the current time to produce a code, whereas a
 * recovery code IS the code.
 *
 * WHAT THIS DOES
 * --------------
 * Replaces every plaintext entry with an argon2id hash — the same primitive and
 * parameters `@b/utils/passwords` uses for account passwords. Verification is a
 * comparison, never a decryption, so there is no key to leak and no way back to
 * the code from the row.
 *
 * The codes the user wrote down keep working: `consumeRecoveryCode` compares the
 * submitted code against the hash.
 *
 * WHY IT IS SAFE TO SKIP THIS SCRIPT (AND STILL WORTH RUNNING)
 * -----------------------------------------------------------
 * `consumeRecoveryCode` reads BOTH shapes, and re-hashes whatever is left the
 * first time a user redeems a code — so an install that upgrades the build and
 * never runs this script does not lock anybody out. But a recovery code is
 * redeemed roughly once in an account's lifetime, so without this script the
 * plaintext stays in the table indefinitely. Running it is the difference
 * between "will be fixed when someone loses their phone" and "is fixed".
 *
 * IDEMPOTENT: an entry that already starts with `$argon2` is left alone, so a
 * second run touches nothing.
 *
 * SAFE: a row is REFUSED, whole and untouched, unless every plaintext entry
 * normalises to the twelve hex characters this codebase has always generated
 * (`crypto.randomBytes(6).toString("hex")`, in the form XXXX-XXXX-XXXX). That
 * refusal is not defensive decoration — `consumeRecoveryCode` skips the argon2
 * work entirely for an input of any other shape, so that a wrong six-digit TOTP
 * (which falls through to the recovery path on every failed login) stays cheap.
 * That shortcut is only sound while every hash in the table came from a code of
 * that shape, and this refusal is what keeps it true.
 *
 * NOTHING IS PRINTED THAT COULD BE REDEEMED. Codes are reported masked.
 *
 * DRY-RUN by default.
 *   Report:  node scripts/migration-hash-recovery-codes.mjs
 *   Apply:   node scripts/migration-hash-recovery-codes.mjs --apply
 *
 * After --apply, nothing needs restarting.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, QueryTypes } from "sequelize";
import argon2 from "argon2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });

const APPLY = process.argv.includes("--apply");

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

const TABLE = "two_factor";

/** The shape every recovery code this codebase has ever generated normalises to. */
const CODE_SHAPE = /^[0-9A-F]{12}$/;

const normalise = (code) => String(code).replace(/-/g, "").toUpperCase();
const isHashed = (entry) => typeof entry === "string" && entry.startsWith("$argon2");

/** Enough to recognise a code in a report, not enough to redeem it. */
const mask = (code) => {
  const bare = normalise(code);
  return bare.length <= 4 ? "****" : `${bare.slice(0, 2)}${"*".repeat(bare.length - 4)}${bare.slice(-2)}`;
};

async function tableExists(tableName) {
  const rows = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function main() {
  console.log(`\nRECOVERY-CODES — ${APPLY ? "APPLY" : "DRY RUN"}\n`);
  console.log(`  database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);

  const [{ v: version }] = await sequelize.query("SELECT VERSION() AS v", {
    type: QueryTypes.SELECT,
  });
  console.log(`  server:   ${version}\n`);

  if (!(await tableExists(TABLE))) {
    console.log(`  ${TABLE} does not exist on this install — nothing to do.\n`);
    await sequelize.close();
    return;
  }

  // Soft-deleted rows are included on purpose: the plaintext is still in the
  // table, and `deletedAt` does not stop a SELECT.
  const rows = await sequelize.query(
    `SELECT id, userId, recoveryCodes, deletedAt
       FROM \`${TABLE}\`
      WHERE recoveryCodes IS NOT NULL AND recoveryCodes <> ''`,
    { type: QueryTypes.SELECT }
  );

  console.log(`  ${rows.length} row(s) carry recovery codes\n`);

  let rowsWithPlaintext = 0;
  let rowsRepaired = 0;
  let rowsRefused = 0;
  let rowsAlreadyHashed = 0;
  let codesHashed = 0;

  for (const row of rows) {
    let entries;
    try {
      entries = JSON.parse(row.recoveryCodes);
    } catch {
      rowsRefused++;
      console.log(`    REFUSED ${row.id} — recoveryCodes is not JSON. Left untouched.`);
      continue;
    }
    if (!Array.isArray(entries)) {
      rowsRefused++;
      console.log(`    REFUSED ${row.id} — recoveryCodes is not an array. Left untouched.`);
      continue;
    }

    const plaintext = entries.filter((e) => !isHashed(e));
    if (plaintext.length === 0) {
      rowsAlreadyHashed++;
      continue;
    }
    rowsWithPlaintext++;

    const oddlyShaped = plaintext.filter(
      (e) => typeof e !== "string" || !CODE_SHAPE.test(normalise(e))
    );
    if (oddlyShaped.length > 0) {
      rowsRefused++;
      console.log(
        `    REFUSED ${row.id} — ${oddlyShaped.length} of ${plaintext.length} entries are not ` +
          `twelve hex characters. Hashing them would put a shape in the table that the login ` +
          `path deliberately never tries to match. Left untouched.`
      );
      continue;
    }

    const label = `${row.id}${row.deletedAt ? " (soft-deleted)" : ""}`;
    if (!APPLY) {
      console.log(
        `    would hash ${plaintext.length} code(s) for ${label}: ` +
          plaintext.map(mask).join(" ")
      );
      rowsRepaired++;
      codesHashed += plaintext.length;
      continue;
    }

    // Sequentially, not Promise.all: argon2's default memoryCost is 64 MiB per
    // hash, and twelve of those at once is a memory spike for no gain on a
    // script that runs once.
    const next = [];
    for (const entry of entries) {
      if (isHashed(entry)) {
        next.push(entry);
        continue;
      }
      next.push(await argon2.hash(normalise(entry)));
      codesHashed++;
    }

    await sequelize.query(
      `UPDATE \`${TABLE}\` SET recoveryCodes = ? WHERE id = ?`,
      { replacements: [JSON.stringify(next), row.id], type: QueryTypes.UPDATE }
    );
    rowsRepaired++;
    console.log(`    hashed ${plaintext.length} code(s) for ${label}`);
  }

  console.log("");
  if (APPLY) {
    // Prove it, rather than reporting the count we intended to write.
    const after = await sequelize.query(
      `SELECT id, recoveryCodes FROM \`${TABLE}\`
        WHERE recoveryCodes IS NOT NULL AND recoveryCodes <> ''`,
      { type: QueryTypes.SELECT }
    );
    let stillPlain = 0;
    for (const row of after) {
      try {
        const entries = JSON.parse(row.recoveryCodes);
        if (Array.isArray(entries) && entries.some((e) => !isHashed(e))) stillPlain++;
      } catch {
        stillPlain++;
      }
    }
    console.log(`  verify: ${stillPlain} row(s) still hold a code that is not hashed`);
  }
  console.log(
    `\n  ${rowsWithPlaintext} row(s) with plaintext, ${rowsRepaired} ` +
      `${APPLY ? "repaired" : "repairable"} (${codesHashed} code(s)), ` +
      `${rowsRefused} refused, ${rowsAlreadyHashed} already hashed\n`
  );
  if (!APPLY && rowsRepaired > 0) {
    console.log("  Re-run with --apply to write these changes.\n");
  }

  await sequelize.close();
}

main().catch(async (error) => {
  console.error("\nRECOVERY-CODES failed:", error?.message ?? error);
  await sequelize.close().catch(() => undefined);
  process.exit(1);
});
