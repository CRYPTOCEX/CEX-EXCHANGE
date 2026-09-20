/**
 * Repair `exchange_currency.precision` rows written by the old spot-currency
 * import.
 *
 *   cd backend
 *   npm run repair:currency-precision            # report only
 *   npm run repair:currency-precision -- --apply # write the fix
 *
 * WHY THIS EXISTS
 * ---------------
 * ccxt reports a currency's precision either as a DIGIT COUNT (8) or as a TICK
 * SIZE (1e-8), depending on the exchange's precisionMode. The import read it
 * with `parseInt`, and `parseInt(1e-8)` parses the string "1e-8" and stops at
 * the 1 — so every currency imported from a TICK_SIZE exchange (Binance, KuCoin,
 * OKX, XT: all of them) was stored as precision 1, and anything finer than 0.001
 * as 0. A currency claiming 1 decimal describes a coin that only exists in
 * tenths.
 *
 * `admin/finance/currency/spot/import.get.ts` now converts correctly, so a fresh
 * import writes the right value. This repairs rows that predate that fix without
 * requiring a full re-import (which would also insert every currency the
 * provider offers, and that is the operator's decision, not a repair).
 *
 * 8 is both the ccxt default for spot and this column's own model default, so it
 * is the safe floor. Rows that already look like a plausible digit count are
 * left alone.
 */

import { models } from "@b/db";

const APPLY = process.argv.includes("--apply");
const FLOOR = 8;

async function main() {
  const rows: any[] = await models.exchangeCurrency.findAll({
    attributes: ["id", "currency", "precision"],
  });

  const broken = rows.filter((r) => {
    const p = Number(r.precision);
    return !Number.isFinite(p) || p < 2;
  });

  console.log(`\n  ${rows.length} spot currencies, ${broken.length} with an implausible precision`);
  if (!broken.length) {
    console.log("  nothing to repair\n");
    return;
  }

  const preview = broken
    .slice(0, 12)
    .map((r) => `${r.currency}=${r.precision}`)
    .join(", ");
  console.log(`  ${preview}${broken.length > 12 ? ", …" : ""}`);

  if (!APPLY) {
    console.log(
      `\n  dry run. Re-run with --apply to set these ${broken.length} rows to precision ${FLOOR}.\n` +
        `  (Or re-import spot currencies from the admin panel to take the provider's\n` +
        `  real values, which is exact but also inserts every currency it offers.)\n`
    );
    return;
  }

  let updated = 0;
  for (const row of broken) {
    await models.exchangeCurrency.update(
      { precision: FLOOR },
      { where: { id: row.id } }
    );
    updated++;
  }
  console.log(`\n  set ${updated} rows to precision ${FLOOR}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("repair failed:", e);
    process.exit(1);
  });
