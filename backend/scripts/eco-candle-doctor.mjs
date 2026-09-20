/**
 * Ecosystem Candle Doctor
 *
 * READ-ONLY forensics for one market's candle series, plus one narrowly scoped
 * repair that has to be asked for by name.
 *
 * WHY THIS EXISTS. An operator reported an eco chart whose y axis ran
 * -30000..110000 around a single "Low 100.00" while the market was trading at
 * 78,000, and the obvious reaction — delete the 100.00 candle — is the wrong
 * one twice over. It is market data: if a trade really happened at 100.00 (and
 * on a fresh market it usually did, because `MarketInstance.initialize` seeds
 * the AI maker's simulated price from `targetPrice` and the first AI trade
 * writes a real candle there) then the low IS 100.00 and rewriting it is
 * falsifying history. And the visible damage was never that one bar: it was
 * that the READ path extended it forward as hundreds of synthetic flat bars.
 * That half is fixed in code (`candles.ts:fillCandleGaps` now leaves an
 * oversized gap as a gap), and this script exists for the half that code cannot
 * decide — which rows are real.
 *
 * WHAT IT REPORTS, per interval:
 *
 *   1. OFF-BOUNDARY ROWS. A candle whose `createdAt` is not on its interval's
 *      UTC boundary. These are the legacy of `ws.ts:normalizeTimeToInterval`,
 *      which was date-fns in LOCAL time and switched on the interval's last
 *      character only — so it filed "5m" rows on 1-minute boundaries and "1d"
 *      rows at local midnight, while every reader normalises to UTC. Two
 *      writers, two keys, two rival rows per period.
 *   2. DUPLICATE BUCKETS. More than one row normalising to the same bucket,
 *      which is what (1) produces and what the chart draws as overlapping bars.
 *   3. PRICE OUTLIERS, each CROSS-CHECKED AGAINST THE TAPE. A row whose range
 *      sits orders of magnitude away from its neighbours is reported together
 *      with whether `ecosystem.trades` holds a fill inside that bucket at that
 *      price. Backed by the tape means REAL, and real stays.
 *   4. STALENESS. How old the newest row of each interval is, next to the
 *      newest row in `ecosystem.trades` — the one reading that separates "the
 *      chart is not drawing what was written" from "nothing was written".
 *
 * WHAT `--execute` DOES, AND ONLY THIS: MERGES each row that is BOTH off its
 * interval boundary AND shadowed by an on-boundary row for the same bucket INTO
 * that on-boundary sibling, and only then deletes it. It refuses to touch an
 * outlier, a lone off-boundary row (deleting it would lose the only record of
 * that period), or anything the tape backs. Everything else it finds is printed
 * for a person to decide about.
 *
 * THE MERGE IS THE WHOLE POINT, AND IT USED TO BE MISSING. This script's
 * justification for the delete was that the shadowed row's "period is already
 * represented" — which confuses the PERIOD being represented with the DATA
 * being represented. The off-boundary row exists precisely BECAUSE the old
 * local-time normaliser wrote real trades into it: its open, high, low, close
 * and volume are prints that happened, and the on-boundary sibling holds only
 * whatever a correctly-bucketing writer put there. Deleting one without folding
 * it in destroys real market data — the exact thing this script was written to
 * prevent. So the sibling is rewritten first (open from the earlier `createdAt`,
 * max high, min low, close from the later, volume summed) and the two
 * statements go out as ONE single-partition batch, so a re-run can never fold
 * the same volume in twice.
 *
 * `fix:eco-candles` (scripts/fix-ecosystem-candles.mjs) performs the same merge
 * across EVERY symbol and keyspace at once and also repairs open-price
 * continuity; reach for that when the problem is platform-wide rather than one
 * market.
 *
 * Dry run by default — and the dry run PRINTS the exact merged row it would
 * write. `--execute` is the only flag that writes.
 *
 *     node backend/scripts/eco-candle-doctor.mjs --symbol BTC/USDT
 *     node backend/scripts/eco-candle-doctor.mjs --symbol BTC/USDT --interval 1m
 *     node backend/scripts/eco-candle-doctor.mjs --symbol BTC/USDT --execute
 *
 * Sibling scripts: `fix-ecosystem-candles.mjs` merges duplicates and repairs
 * open prices across EVERY symbol at once and rewrites rows; this one diagnoses
 * ONE market and, by default, changes nothing.
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, auth } from "cassandra-driver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, "../../.env") });

const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};
const SYMBOL = argOf("--symbol");
const ONLY_INTERVAL = argOf("--interval");
const EXECUTE = argv.includes("--execute");

if (!SYMBOL) {
  console.error("Usage: node backend/scripts/eco-candle-doctor.mjs --symbol <BASE/QUOTE> [--interval 1m] [--execute]");
  process.exit(1);
}

const ks = process.env.SCYLLA_KEYSPACE || "trading";

// SCYLLA_CONNECT_POINTS is what the platform actually sets; SCYLLA_HOST is kept
// as a fallback for an operator who set only that. Getting this wrong sends the
// script to localhost, where it reports a connection failure against a
// perfectly healthy cluster.
const scyllaConfig = {
  contactPoints: process.env.SCYLLA_CONNECT_POINTS
    ? process.env.SCYLLA_CONNECT_POINTS.split(",").map((p) => p.trim())
    : [process.env.SCYLLA_HOST || "localhost"],
  localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1",
  keyspace: ks,
};
if (process.env.SCYLLA_USERNAME && process.env.SCYLLA_PASSWORD) {
  scyllaConfig.authProvider = new auth.PlainTextAuthProvider(
    process.env.SCYLLA_USERNAME,
    process.env.SCYLLA_PASSWORD
  );
}
const scylla = new Client(scyllaConfig);

const intervals = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1d", "3d", "1w"];

const intervalDurations = {
  "1m": 60e3,
  "3m": 3 * 60e3,
  "5m": 5 * 60e3,
  "15m": 15 * 60e3,
  "30m": 30 * 60e3,
  "1h": 3600e3,
  "2h": 2 * 3600e3,
  "4h": 4 * 3600e3,
  "6h": 6 * 3600e3,
  "12h": 12 * 3600e3,
  "1d": 86400e3,
  "3d": 3 * 86400e3,
  "1w": 7 * 86400e3,
};

/*
  THE ONE NORMALISER, transcribed from
  backend/src/api/(ext)/ecosystem/utils/candles.ts. A script that used its own
  bucket arithmetic would report a disagreement it had invented itself, which is
  the exact failure it is here to find.
*/
function normalizeToIntervalBoundary(timestamp, interval) {
  const date = new Date(timestamp);
  switch (interval) {
    case "1w": {
      const dayOfWeek = date.getUTCDay();
      date.setUTCDate(date.getUTCDate() - dayOfWeek);
      date.setUTCHours(0, 0, 0, 0);
      break;
    }
    case "3d":
      return Math.floor(date.getTime() / (3 * 86400e3)) * 3 * 86400e3;
    case "1d":
      date.setUTCHours(0, 0, 0, 0);
      break;
    case "12h":
      date.setUTCHours(Math.floor(date.getUTCHours() / 12) * 12, 0, 0, 0);
      break;
    case "6h":
      date.setUTCHours(Math.floor(date.getUTCHours() / 6) * 6, 0, 0, 0);
      break;
    case "4h":
      date.setUTCHours(Math.floor(date.getUTCHours() / 4) * 4, 0, 0, 0);
      break;
    case "2h":
      date.setUTCHours(Math.floor(date.getUTCHours() / 2) * 2, 0, 0, 0);
      break;
    case "1h":
      date.setUTCMinutes(0, 0, 0);
      break;
    case "30m":
      date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 30) * 30, 0, 0);
      break;
    case "15m":
      date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 15) * 15, 0, 0);
      break;
    case "5m":
      date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 5) * 5, 0, 0);
      break;
    case "3m":
      date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 3) * 3, 0, 0);
      break;
    case "1m":
      date.setUTCSeconds(0, 0);
      break;
    default:
      date.setUTCMilliseconds(0);
  }
  return date.getTime();
}

const hr = (c) => console.log((c || "=").repeat(78));
const iso = (t) => new Date(t).toISOString();
const ago = (t) => {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

/** The newest trade on the tape, which says whether the market is live at all. */
async function newestTrade() {
  const r = await scylla.execute(
    `SELECT "createdAt", price, amount FROM ${ks}.trades WHERE symbol = ? ORDER BY "createdAt" DESC LIMIT 1`,
    [SYMBOL],
    { prepare: true }
  );
  return r.rows[0] || null;
}

/**
 * Does the tape back a candle's extreme?
 *
 * A candle whose low is 100 while its neighbours trade at 78,000 is either a
 * real print or a bad write, and only `ecosystem.trades` can say which. Asked
 * per suspect row, never in bulk: this is a range read over one bucket.
 */
async function tapeBacks(bucketStart, duration, low, high) {
  const r = await scylla.execute(
    `SELECT price FROM ${ks}.trades WHERE symbol = ? AND "createdAt" >= ? AND "createdAt" < ?`,
    [SYMBOL, new Date(bucketStart), new Date(bucketStart + duration)],
    { prepare: true }
  );
  if (r.rows.length === 0) return { checked: true, backed: false, prints: 0 };
  // Generous tolerance on purpose: the question is "did the market visit this
  // region", not "does this row round-trip to the tick".
  const backed = r.rows.some((row) => {
    const p = Number(row.price);
    return p >= low * 0.5 && p <= high * 2;
  });
  return { checked: true, backed, prints: r.rows.length };
}

async function inspect(interval, tape) {
  const duration = intervalDurations[interval];
  const r = await scylla.execute(
    `SELECT "createdAt", "updatedAt", open, high, low, close, volume FROM ${ks}.candles WHERE symbol = ? AND interval = ? ORDER BY "createdAt" ASC`,
    [SYMBOL, interval],
    { prepare: true }
  );
  const rows = r.rows.map((row) => ({
    at: row.createdAt.getTime(),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
  }));

  hr("-");
  console.log(`[${interval}]  ${rows.length} row(s)`);
  if (rows.length === 0) {
    console.log("    none stored.");
    return { merges: [] };
  }

  const newest = rows[rows.length - 1];
  console.log(`    newest    ${iso(newest.at)}  (${ago(newest.at)})  close=${newest.close}  volume=${newest.volume}`);
  if (tape) {
    const tradeAt = tape.createdAt.getTime();
    const behind = tradeAt - newest.at;
    if (behind > duration * 2) {
      console.log(`    *** STALE ***  the tape's newest print is ${iso(tradeAt)} (${ago(tradeAt)}), ${Math.round(behind / duration)} bucket(s) newer than this series.`);
      console.log("    Trades are being written and candles are not. Check the trading process's log for");
      console.log("    'CRITICAL: settled fills could not be persisted' — candle statements ride the same");
      console.log("    Scylla batch as the order rows, while the tape is written outside it.");
    }
  }

  // --- 1 & 2: off-boundary rows and duplicate buckets ------------------------
  const byBucket = new Map();
  const offBoundary = [];
  for (const row of rows) {
    const bucket = normalizeToIntervalBoundary(row.at, interval);
    if (bucket !== row.at) offBoundary.push({ row, bucket });
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket).push(row);
  }

  const duplicated = [...byBucket.entries()].filter(([, rs]) => rs.length > 1);

  if (offBoundary.length) {
    console.log(`    off-boundary rows: ${offBoundary.length}`);
    for (const { row, bucket } of offBoundary.slice(0, 5)) {
      console.log(`      stored ${iso(row.at)} -> belongs in ${iso(bucket)}`);
    }
    if (offBoundary.length > 5) console.log(`      ... and ${offBoundary.length - 5} more`);
    console.log("    Written by the old local-time normaliser. Every reader looks in the UTC bucket,");
    console.log("    so these rows are invisible to the chart while still occupying the partition.");
  }
  if (duplicated.length) {
    console.log(`    duplicate buckets: ${duplicated.length}`);
    for (const [bucket, rs] of duplicated.slice(0, 5)) {
      console.log(`      ${iso(bucket)}  ${rs.length} rows: ${rs.map((x) => x.close).join(", ")}`);
    }
    const noKeeper = duplicated.filter(([bucket, rs]) => !rs.some((x) => x.at === bucket));
    if (noKeeper.length) {
      console.log(`      ${noKeeper.length} of these hold ONLY off-boundary rows — there is no on-boundary`);
      console.log("      row to fold them into, so this script leaves them alone. Merging those means");
      console.log("      writing a row at a key that does not exist yet: npm run fix:eco-candles does it.");
    }
  }

  /*
    THE ONLY REPAIRABLE SHAPE. An off-boundary row whose bucket ALSO holds an
    on-boundary row: unaddressable by any reader, but its OHLCV is real market
    data that the on-boundary sibling does not contain. A lone off-boundary row
    is NOT touched — it is the only record of that period, and there is nothing
    to fold it into.

    Note the two rows are NOT interchangeable. `createdAt` is part of the
    primary key and a bucket can hold at most one row AT the boundary, so the
    on-boundary row is always the earliest in its bucket — which is why the
    merged open is always the keeper's own open and the merged close always
    comes from the latest shadowed row.
  */
  const merges = [];
  for (const [bucket, rs] of byBucket) {
    if (rs.length < 2) continue;
    const keeper = rs.find((s) => s.at === bucket);
    if (!keeper) continue; // lone/duplicated off-boundary rows: reported, never touched
    const doomed = rs.filter((s) => s.at !== bucket);
    if (doomed.length === 0) continue;

    // Chronological, so "open from the earlier, close from the later" is
    // well-defined even when several off-boundary rows shadow one bucket.
    const ordered = [keeper, ...doomed].sort((a, b) => a.at - b.at);
    const finite = (n, fallback) => (Number.isFinite(n) ? n : fallback);

    let high = finite(ordered[0].high, ordered[0].close);
    let low = finite(ordered[0].low, ordered[0].close);
    let volume = finite(ordered[0].volume, 0);
    for (let i = 1; i < ordered.length; i++) {
      const r = ordered[i];
      high = Math.max(high, finite(r.high, r.close));
      low = Math.min(low, finite(r.low, r.close));
      volume += finite(r.volume, 0);
    }
    const close = ordered[ordered.length - 1].close;
    const open = ordered[0].open;

    merges.push({
      bucket,
      keeper,
      doomed,
      merged: {
        open,
        // A merged close outside the merged range would render as a broken
        // wick, and the pin can only come from a row whose own high/low was
        // already inconsistent. Span it rather than write a bar that cannot be
        // drawn.
        high: Math.max(high, open, close),
        low: Math.min(low, open, close),
        close,
        volume,
      },
    });
  }

  if (merges.length) {
    const doomedCount = merges.reduce((n, m) => n + m.doomed.length, 0);
    console.log(`    -> ${doomedCount} row(s) in ${merges.length} bucket(s) are off-boundary AND shadowed by an on-boundary row.`);
    console.log(`       ${EXECUTE ? "MERGING then deleting (--execute)" : "Dry run — the merge below is what --execute would write."}`);
    // EVERY bucket, not the first handful. This listing is the operator's only
    // chance to see what --execute is about to rewrite, and a row omitted here
    // is a row whose trades get folded in unseen. Long output on a badly
    // damaged market is the correct cost; redirect it to a file.
    for (const m of merges) {
      const k = m.keeper;
      const g = m.merged;
      console.log(`       bucket ${iso(m.bucket)}`);
      console.log(`         keeper  o=${k.open} h=${k.high} l=${k.low} c=${k.close} v=${k.volume}`);
      for (const d of m.doomed) {
        console.log(`         folding ${iso(d.at)}  o=${d.open} h=${d.high} l=${d.low} c=${d.close} v=${d.volume}`);
      }
      console.log(`         merged  o=${g.open} h=${g.high} l=${g.low} c=${g.close} v=${g.volume}`);
    }
    console.log("       The shadowed rows hold REAL trades written by the old local-time normaliser, so");
    console.log("       their OHLCV is folded into the keeper BEFORE they are removed. Merge and delete");
    console.log("       ride one single-partition batch, so a repeated run cannot double the volume.");
  }

  // --- 3: outliers, cross-checked against the tape --------------------------
  // The median close is the reference: a mean is dragged by the very outlier we
  // are hunting for, which is how a bad row hides itself.
  const closes = rows.map((x) => x.close).filter((x) => x > 0).sort((a, b) => a - b);
  if (closes.length >= 5) {
    const median = closes[Math.floor(closes.length / 2)];
    const suspects = rows.filter((x) => x.low > 0 && (x.low < median / 10 || x.high > median * 10));
    if (suspects.length) {
      console.log(`    price outliers vs median close ${median}: ${suspects.length}`);
      for (const s of suspects.slice(0, 10)) {
        const bucket = normalizeToIntervalBoundary(s.at, interval);
        const backing = await tapeBacks(bucket, duration, s.low, s.high);
        const verdict = backing.prints === 0
          ? "NO TRADES in this bucket — the tape cannot confirm or deny it"
          : backing.backed
            ? "REAL — the tape holds a print in this region; it stays"
            : `UNBACKED — ${backing.prints} print(s) in this bucket, none near this price`;
        console.log(`      ${iso(s.at)}  o=${s.open} h=${s.high} l=${s.low} c=${s.close} v=${s.volume}`);
        console.log(`        ${verdict}`);
      }
      console.log("    NOT deleted by --execute, whatever the verdict. A real print is history and stays;");
      console.log("    an unbacked one is a judgement call about a customer-visible market, so it is");
      console.log("    reported for a person. The chart no longer extends such a bar into a flat plateau");
      console.log("    (candles.ts:fillCandleGaps), which is what made one old bar distort a live axis.");
    }
  }

  return { merges };
}

async function main() {
  await scylla.connect();
  hr();
  console.log(`ECOSYSTEM CANDLE DOCTOR — ${SYMBOL}   keyspace=${ks}   ${EXECUTE ? "EXECUTE" : "DRY RUN"}`);
  hr();

  const tape = await newestTrade();
  if (tape) {
    console.log(`tape: newest print ${iso(tape.createdAt.getTime())} (${ago(tape.createdAt.getTime())}) at ${Number(tape.price)}`);
  } else {
    console.log("tape: no trades recorded for this symbol.");
  }

  const wanted = ONLY_INTERVAL ? [ONLY_INTERVAL] : intervals;
  let deletedTotal = 0;
  let mergedTotal = 0;
  for (const interval of wanted) {
    if (!intervalDurations[interval]) {
      console.log(`\n[${interval}] not a known interval, skipping.`);
      continue;
    }
    const { merges } = await inspect(interval, tape);
    if (!EXECUTE) continue;

    for (const m of merges) {
      /*
        ONE BATCH PER BUCKET, and it must contain BOTH statements.

        The candles table is PRIMARY KEY (symbol, interval, "createdAt") — the
        partition key is `symbol` alone — so every statement here lands in the
        same partition and Scylla applies the batch atomically. That matters
        because the two halves are not independently safe: the merged row and
        the deletes are only correct TOGETHER. If the UPDATE landed and the
        DELETEs did not, the next run would find the same shadowed rows and fold
        their volume in a SECOND time; if the DELETEs landed and the UPDATE did
        not, the trades they held are gone. Neither is possible in one batch.
      */
      const statements = [
        {
          query: `UPDATE ${ks}.candles SET open = ?, high = ?, low = ?, close = ?, volume = ?, "updatedAt" = ? WHERE symbol = ? AND interval = ? AND "createdAt" = ?`,
          params: [
            m.merged.open,
            m.merged.high,
            m.merged.low,
            m.merged.close,
            m.merged.volume,
            new Date(),
            SYMBOL,
            interval,
            new Date(m.bucket),
          ],
        },
        ...m.doomed.map((d) => ({
          query: `DELETE FROM ${ks}.candles WHERE symbol = ? AND interval = ? AND "createdAt" = ?`,
          params: [SYMBOL, interval, new Date(d.at)],
        })),
      ];

      await scylla.batch(statements, { prepare: true, logged: true });
      mergedTotal++;
      deletedTotal += m.doomed.length;
      console.log(`  [${interval}] merged ${m.doomed.length} row(s) into ${iso(m.bucket)} (volume now ${m.merged.volume})`);
    }
  }

  hr();
  if (EXECUTE) {
    console.log(`Merged ${deletedTotal} shadowed off-boundary row(s) into ${mergedTotal} on-boundary sibling(s),`);
    console.log("then deleted them. No trade was lost: every merged row's OHLCV is in its sibling.");
  } else {
    console.log("Dry run — nothing was written. Re-run with --execute to fold the rows reported as");
    console.log("off-boundary AND shadowed into their on-boundary sibling and then delete them.");
    console.log("For the same repair across every symbol and keyspace at once, plus open-price");
    console.log("continuity: npm run fix:eco-candles");
  }
  hr();
}

main()
  .catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await scylla.shutdown().catch(() => {});
  });
