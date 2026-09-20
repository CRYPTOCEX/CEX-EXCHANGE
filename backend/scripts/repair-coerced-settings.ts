/**
 * Repair numeric settings that the old settings PUT stored as `"true"`/`"false"`.
 *
 *   pnpm --filter backend repair:settings          report only
 *   pnpm --filter backend repair:settings --apply  write the repair
 *
 * ---------------------------------------------------------------------------
 * WHAT WENT WRONG, AND WHY FIXING THE WRITER WAS NOT ENOUGH
 * ---------------------------------------------------------------------------
 * `admin/system/settings/index.put.ts` used to run AJV over a body AJV could not
 * describe. `convertBooleanStrings` looked every settings key up in
 * `schema.properties`, found nothing, treated the value as untyped, and coerced
 * it: `"1"`/`"on"`/`"yes"` became boolean `true`, `"0"`/`"off"`/`"no"` became
 * boolean `false`. The handler then `String()`d that, so a NUMBER field an
 * operator typed as 1 was written to the row as the literal text `"true"`.
 *
 * The route was fixed (`skipBodyValidation: true`). THE ROWS WERE NOT. Every
 * install that pressed Save on the Settings page before that fix still holds the
 * corrupted values today, and a fix that only stops new corruption leaves the
 * existing damage in place — the same shape as the knowledge-pack checksum bug,
 * where the writer was fixed and already-poisoned installs needed a version bump
 * to recover.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT COSMETIC
 * ---------------------------------------------------------------------------
 * Measured on a live install: `spotWithdrawFee` held `"true"`.
 * `finance/withdraw/spot/index.post.ts` read it with `parseFloat`, got NaN, and
 * NaN propagated silently through the fee into `totalDeductionAmount` — at which
 * point BOTH balance guards went dead, because `availableBalance < NaN` and
 * `newBalance < 0` are each `false` when the operand is NaN. A cosmetic settings
 * row disabled the insufficient-funds check on a withdrawal route.
 *
 * The readers are being hardened as they are found (`CacheManager.toNumber`),
 * but a hardened reader silently substitutes a DEFAULT — so an operator who
 * configured a 1% fee still collects nothing until the row itself is repaired.
 *
 * ---------------------------------------------------------------------------
 * THE REPAIR IS EXACT, NOT A GUESS
 * ---------------------------------------------------------------------------
 * The coercion had exactly two numeric inputs: `"1"` became `true` and `"0"`
 * became `false`. Nothing else in a numeric field could produce a boolean. So
 * the inverse mapping is lossless — `"true"` -> `"1"`, `"false"` -> `"0"` — and
 * restores what the operator actually typed rather than what the platform ships.
 *
 * A key whose declared type is a switch is left alone: `"true"` is its CORRECT
 * value. The declared types come from `frontend/config/settings.ts`, which is the
 * screen that writes these rows and therefore the only authority on which of
 * them are numbers.
 */

import * as fs from "fs";
import * as path from "path";
import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";

const APPLY = process.argv.includes("--apply");

const SETTINGS_CONFIG = path.resolve(
  __dirname,
  "../../frontend/config/settings.ts"
);

/** Control types whose value is a number. Everything else may hold "true". */
const NUMERIC_TYPES = new Set(["range", "number"]);

interface Declared {
  key: string;
  type: string;
}

/**
 * The declared settings, read out of the admin screen's own config.
 *
 * A regex rather than an import: this script runs under the backend's tsconfig
 * and `frontend/config/settings.ts` pulls in frontend-only types. The shape it
 * matches is the one the file has used since it was written — a `key:` followed
 * by a `type:` inside the same object literal — and a key it fails to match is
 * simply not repaired, which is the safe direction.
 */
function declaredSettings(): Declared[] {
  const source = fs.readFileSync(SETTINGS_CONFIG, "utf8");
  const pattern =
    /key:\s*["']([A-Za-z0-9_.:-]+)["'][\s\S]{0,600}?type:\s*["']([a-z]+)["']/g;
  const out: Declared[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    out.push({ key: match[1], type: match[2] });
  }
  return out;
}

async function main() {
  if (!fs.existsSync(SETTINGS_CONFIG)) {
    console.error(`Cannot find ${SETTINGS_CONFIG}`);
    process.exit(1);
  }

  const declared = declaredSettings();
  const numeric = new Map(
    declared.filter((d) => NUMERIC_TYPES.has(d.type)).map((d) => [d.key, d.type])
  );

  console.log(
    `Declared settings: ${declared.length} (${numeric.size} numeric)\n`
  );

  const rows = await models.settings.findAll();
  const damaged: { key: string; was: string; becomes: string }[] = [];

  for (const row of rows) {
    if (!numeric.has(row.key)) continue;
    const value = String(row.value ?? "").trim().toLowerCase();
    if (value !== "true" && value !== "false") continue;
    damaged.push({
      key: row.key,
      was: String(row.value),
      becomes: value === "true" ? "1" : "0",
    });
  }

  /*
   * A SECOND PASS THE DECLARED LIST CANNOT SEE.
   *
   * Extension settings screens write rows this config file never declares, so a
   * corrupted `p2pDisputeFeePercent` or `gatewayMinPaymentAmount` would go
   * unreported. Those are named by shape, not repaired automatically: without a
   * declared type there is no proof the row is numeric, and rewriting a switch
   * to "1" would be a new defect rather than a repair.
   */
  const NUMERIC_SHAPE =
    /(fee|percent|percentage|amount|limit|threshold|days|hours|minutes|seconds|budget|spread|precision|timeout|leverage|slippage|bps)$/i;
  const suspected = rows
    .filter((row) => !numeric.has(row.key))
    .filter((row) => NUMERIC_SHAPE.test(row.key))
    .filter((row) => {
      const value = String(row.value ?? "").trim().toLowerCase();
      return value === "true" || value === "false";
    });

  if (!damaged.length && !suspected.length) {
    console.log("No coerced numeric settings found. Nothing to repair.");
    process.exit(0);
  }

  if (damaged.length) {
    console.log(`Coerced numeric settings: ${damaged.length}`);
    for (const item of damaged) {
      console.log(`  ${item.key}: "${item.was}" -> "${item.becomes}"`);
    }
    console.log("");
  }

  if (suspected.length) {
    console.log(
      `Undeclared keys with a numeric-sounding name holding a boolean: ${suspected.length}`
    );
    console.log(
      "  (reported only — check each against its own settings screen and fix by hand)"
    );
    for (const row of suspected) {
      console.log(`  ${row.key} = "${row.value}"`);
    }
    console.log("");
  }

  if (!APPLY) {
    console.log("Report only. Re-run with --apply to write the repair.");
    process.exit(0);
  }

  /*
   * Written through `updateSetting`, never with a raw UPDATE.
   *
   * Settings live in THREE places — the row, every process's in-memory Map, and
   * a Redis hash with no TTL that survives a restart. A hand-edited row reaches
   * none of the other two, so the corrupted value would keep being served until
   * something happened to drop the Map. `updateSetting(key, value, true)` writes
   * the row, writes the hash, and announces the invalidation that makes other
   * processes reload.
   */
  const cache = CacheManager.getInstance();
  for (const item of damaged) {
    await cache.updateSetting(item.key, item.becomes, true);
    console.log(`  repaired ${item.key} = "${item.becomes}"`);
  }

  console.log(`\nRepaired ${damaged.length} setting(s).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
