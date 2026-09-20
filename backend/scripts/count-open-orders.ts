/**
 * Count OPEN ecosystem orders, per symbol.
 *
 * WHY: the matching engine loads EVERY open order into memory at boot
 * (`initializeOrders` -> `getAllOpenOrders`), normalising each row into an object
 * carrying six BigInts and two Dates. On a live install that has been running an
 * AI market maker, that table grows fast, and a boot that used to take a second
 * becomes an out-of-memory crash:
 *
 *     FATAL ERROR: Ineffective mark-compacts near heap limit
 *     7770.3 (7774.5) -> 7770.3 (7774.5) MB
 *
 * Mark-compact reclaiming nothing means the memory is RETAINED, not garbage —
 * so the question is simply "how many rows is it holding?". This answers that
 * without booting the server, which is the thing that cannot currently start.
 *
 * Read-only. Touches nothing.
 *
 *     cd backend
 *     npx tsx -r dotenv/config -r ./module-alias-setup.ts scripts/count-open-orders.ts dotenv_config_path=../.env
 */

import client, { scyllaKeyspace } from "@b/api/(ext)/ecosystem/utils/scylla/client";

async function main() {
  const symbols = new Set<string>();

  // Same enumeration the engine uses: the market list first, then any symbol
  // that still has orderbook rows (covers a deleted market with live orders).
  try {
    const { models } = await import("@b/db");
    const markets = await models.ecosystemMarket.findAll({
      attributes: ["currency", "pair"],
    });
    markets.forEach((m: any) => symbols.add(`${m.currency}/${m.pair}`));
  } catch (error: any) {
    console.error(`Could not read ecosystemMarket: ${error.message}`);
  }

  try {
    const rows = await client.execute(
      `SELECT DISTINCT symbol, side FROM ${scyllaKeyspace}.orderbook;`,
      [],
      { prepare: true }
    );
    rows.rows.forEach((r: any) => r.symbol && symbols.add(r.symbol));
  } catch {
    /* orderbook may be empty; the market list is the primary source */
  }

  if (!symbols.size) {
    console.log("No ecosystem markets found — the engine would load nothing.");
    return;
  }

  const counts: Array<{ symbol: string; open: number }> = [];
  let total = 0;

  for (const symbol of symbols) {
    try {
      // COUNT(*) rather than fetching rows: the whole point is to measure the
      // set WITHOUT materialising it, since materialising it is the bug.
      const res = await client.execute(
        `SELECT COUNT(*) AS c FROM ${scyllaKeyspace}.orders WHERE status = 'OPEN' AND symbol = ? ALLOW FILTERING;`,
        [symbol],
        { prepare: true }
      );
      const open = Number(res.rows?.[0]?.c ?? 0);
      counts.push({ symbol, open });
      total += open;
    } catch (error: any) {
      console.error(`  ${symbol}: query failed — ${error.message}`);
    }
  }

  counts.sort((a, b) => b.open - a.open);

  console.log(`\n  OPEN ecosystem orders across ${symbols.size} symbol(s)\n`);
  for (const c of counts.slice(0, 25)) {
    if (!c.open) continue;
    console.log(`    ${String(c.open).padStart(10)}  ${c.symbol}`);
  }
  const zero = counts.filter((c) => !c.open).length;
  if (zero) console.log(`    (${zero} symbol(s) with none)`);

  console.log(`\n    TOTAL: ${total.toLocaleString()} open orders`);

  // Rough, deliberately conservative. A normalised order is an object with ~20
  // properties including six BigInts and two Dates; 1-2 KB retained per order is
  // a realistic figure once V8 object headers, the property map, the queue array
  // slot and the per-symbol index are all counted.
  const lowGb = (total * 1024) / 1024 ** 3;
  const highGb = (total * 2048) / 1024 ** 3;
  console.log(
    `    Estimated heap just to hold them: ${lowGb.toFixed(2)}–${highGb.toFixed(2)} GB ` +
      `(cap is 7.78 GB)\n`
  );

  if (highGb > 4) {
    console.log(
      "    This is large enough to explain the boot OOM on its own.\n" +
        "    The engine holds all of these simultaneously, and the orderbook\n" +
        "    reconciliation walks the same set again.\n"
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
