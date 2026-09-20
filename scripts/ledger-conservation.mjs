#!/usr/bin/env node
/**
 * Ledger conservation runner. Whole-table money checks as SQL against a CLONE.
 *
 * WHY THIS EXISTS BESIDE e2e/unit/backend/_invariants/money.ts.
 * money.ts spells the invariants (CONSERVATION at money.ts:89 moneySnapshot and
 * :125 expectConserved, CREDIT-ONCE at :158) but reads the in-memory seam store
 * (money.ts:61 imports store from ../wallet/_support/mysql-shaped-db), so it can
 * only judge what a hermetic test drove through the seam. The perf and chaos
 * lanes of plans/done/ORDER-SCALE-10K.md (WP-0.6, WP-0.8) write REAL rows into a
 * probe clone through a spawned backend, and something has to judge those rows
 * after the fact. This script is that judge: the same three questions, asked of
 * `wallet`, `transaction` and `wallet_audit_log` on a MariaDB clone. It is plain
 * JS with mysql2 so it needs no build step and can run from a lane's teardown.
 *
 * THE DATABASE NAME IS AN ALLOWLIST, CASE-FOLDED. The name must contain `probe`
 * or `test` after lower-casing: a denylist lets `V5` through
 * (@@lower_case_table_names is 1 here, verified), and only refuses the names
 * someone thought to list. This script only READS, but a runner that can be
 * pointed at the live database by a one-character typo is a runner that will
 * one day be pointed there by a script that also writes. The Rust live lane
 * applied the same rule and was where that reasoning was written out; it went
 * with the whole Rust tree when the port was abandoned, so this paragraph is
 * now the only copy of it — which is why `refuse()` below states the reason to
 * the operator in full instead of citing a file nobody can open.
 *
 * WHAT IS PROVABLE FROM ROWS ALONE, AND WHAT IS NOT.
 * `transaction.type` does not carry direction: HOLD, RELEASE, TRADE_DEBIT and
 * TRADE_CREDIT all map to EXCHANGE_ORDER (WalletService.ts:462-471
 * mapOperationTypeToTransactionType), and `amount` is not the wallet delta
 * either: debit() moves amount + fee (WalletService.ts:705), executeFromHold()
 * takes amount + fee off inOrder (:1095-1105), but ecoDebit() moves amount alone
 * (:1957-1965) and ecoCredit() adds amount alone (:1752-1756). So SUM(amount) by
 * type proves nothing. What every WalletService write DOES carry is the chain:
 * metadata.previousBalance/newBalance (credit :621, debit :744, hold :871,
 * release :1005, transfer :1331/:1360, ecoCredit :1861, ecoDebit :2131,
 * ecoRefund :2409) and previousInOrder/newInOrder (hold :873, release :1007,
 * executeFromHold :1141), plus metadata.flow (LEDGER_FLOW at :74, written after
 * the caller's spread so a caller cannot override it). The checks below are
 * built on that chain:
 *
 *   IN        total holdings rose by exactly amount            (credit legs)
 *   OUT       total holdings fell by amount or amount + fee    (debit legs)
 *   INTERNAL  balance and inOrder moved by equal and opposite   (hold, release)
 *
 * A row with no chain fields (written before the flow marker existed, or by a
 * door that bypasses WalletService, or the ECO chain-transfer row at
 * WalletService.ts:2740 which moves per-chain trackers and not wallet.balance)
 * claims no wallet delta and cannot be proved either way. It is reported as
 * UNPROVABLE, never silently counted as zero; --strict turns that into a fail.
 *
 * TWO MODES, BECAUSE A CLONE OF LIVE v5 IS NOT A FROM-ZERO LEDGER.
 * Whole-table mode (the default) starts every wallet at 0 and walks every live
 * row. It is green only on a database whose whole history went through
 * WalletService, and red on a clone of live v5, where 183 of the 427 wallets
 * that have chain rows do not end where their last row says (measured
 * 2026-09-05 on v5_perf_probe). Snapshot mode is what the perf and chaos lanes
 * use: `--snapshot <file>` records every wallet's balance and inOrder plus a
 * row watermark BEFORE the run; `--against <file>` walks only the rows written
 * since, from that baseline, exactly like moneySnapshot/expectConserved
 * (money.ts:89, :125). The deleted Rust lane's Snapshot had the same shape.
 *
 * THE CHECKS.
 *   1. CONSERVATION. Per (wallet type, currency): the move in SUM(balance +
 *      inOrder) equals the net of the legs in the window; per wallet: the chain
 *      links (each row's previous* equals the running state) and ends at the
 *      wallet's current balance and inOrder; per row: flow agrees with the
 *      chain delta. An injected credit row that no wallet update backs breaks
 *      all three.
 *   2. CREDIT-ONCE. referenceId and idempotencyKey are unique over live rows
 *      (paranoid rows ignored; a soft-deleted key legitimately replays, so
 *      counting it a duplicate would be a false positive), and the UNIQUE
 *      indexes that enforce that (transaction.ts:137, :153;
 *      walletAuditLog.ts:158) still exist.
 *   3. AUDIT. Every WalletService row (one carrying flow or chain fields) has
 *      exactly one wallet_audit_log row pointing at it, whose operation agrees
 *      with the flow and whose balances agree with the chain. The audit write
 *      is best-effort inside the same transaction (AuditLogger.ts:49-91), so a
 *      missing row is a real finding, not a race.
 *   4. IN-ORDER (--scylla, off by default). For ECO and COPY_TRADING wallets,
 *      inOrder equals the held share of the user's OPEN orders in the Scylla
 *      keyspace: BUY holds (cost + fee) * remaining / amount of quote
 *      (placeOrder.ts:1008 holds cost + fee), SELL holds remaining of base
 *      (:1011), plus reservedAmount of every resting stop (stopOrders.ts:9-13,
 *      statuses PENDING, TRIGGERING, CANCELLING per stopQueries.ts:278). Bot
 *      and market-maker orders are skipped: they settle against the pool, not
 *      a user wallet (matchmaking.ts:776-906). FUTURES is another engine and
 *      another programme (plan rule 10) and is not checked here.
 *
 * Output: one table per check with PASS / FAIL / WARN and the offending rows
 * capped at 20. Exit 0 when every check passes, 1 when any FAILS, 2 on a
 * refusal or a usage error. `--json <file>` also writes the full result.
 *
 * THE TOMBSTONE IS THE THIRD PLACE A KEY CAN BE SPENT (M-041, P2 exit 10).
 * `transaction.idempotencyKey` is globally UNIQUE and that index is the last
 * line of defence against a double credit. The archive job HARD-deletes and
 * `transaction_archive` carries no UNIQUE key, so the moment a row moves there
 * its key stops being taken: a PSP redelivery, a WAL replay or a retried cron
 * job presenting that key would find nothing live, find nothing in the index,
 * and pay again. `ledger_key_tombstone` (idempotencyKey PK, referenceId,
 * archivedAt) is the headstone every archived row must leave, and check 2 below
 * now asks three more questions of it:
 *
 *   2b  every DISTINCT idempotencyKey in `transaction_archive` has a tombstone
 *       -- an archived row without one is a key set free;
 *   2c  no live row holds a key (or a referenceId) a tombstone remembers
 *       -- that is the replay the tombstone exists to refuse, already paid;
 *   2d  the archive exists but the tombstone table does not -- reported as a
 *       FAIL, not a skip, because keys have been hard-deleted with no headstone.
 *
 * A run against an install with no archive and no tombstone table reports both
 * as ABSENT and asks none of the three. It never reports them as passed: a
 * check that did not run is not a check that passed.
 *
 * THE M-014 TYPED CHAIN COLUMNS ARE READ WHEN PRESENT.
 * M-014 adds `flow`, `operationType`, `previousBalance`, `newBalance`,
 * `previousInOrder` and `newInOrder` to `transaction` as typed columns beside
 * the `metadata` JSON that has always carried them. They are a MIRROR, not a
 * replacement -- `metadata` is still the contract, key order and all -- so this
 * script reads the column when it exists, falls back to the JSON when it does
 * not, and reports any row where the two DISAGREE as check 1e. A row whose
 * column and JSON differ is a row where half the readers see one number and half
 * the other, which is worse than either being wrong on its own. The archive
 * table has no such columns, so the union selects NULL for them on that side and
 * those rows fall back to the JSON exactly as before.
 *
 * LIVE AND ARCHIVE ARE ONE LEDGER. WP-4.4's retention job
 * (backend/src/cron/ledger-archive.ts) moves rows older than the cutoff into
 * `transaction_archive` and `wallet_audit_log_archive` with the same columns.
 * A conservation walk that read only the live tables would then start every
 * old wallet mid-chain and call the archive job a money leak, so every reader
 * below selects from a UNION ALL of the live table and its archive whenever
 * the archive tables exist (reported on the first line), and the CREDIT-ONCE
 * check groups keys across both. An install without the archive tables reads
 * exactly what it read before.
 *
 * THE RUN MUST HAVE COMPARED SOMETHING, AND SAYS HOW MUCH (check 0).
 * Every check above is a search for offending rows, so every one of them is
 * vacuously green over an empty set. A freshly migrated probe database, a lane
 * whose backend never started, a driver pointed at another schema, a `--against`
 * snapshot taken AFTER the load instead of before it: each of those prints PASS
 * on every check and GREEN on the last line, and nothing in that output says the
 * run examined nothing. An invented green is the worst outcome this script can
 * produce, so the counts are a check of their own — check 0 — and it FAILS the
 * run rather than warning:
 *
 *   rows compared       rows that carried a chain and were walked against the
 *                       running state. NOT rows examined: a window made only of
 *                       rows with no chain fields proves nothing, and the two
 *                       numbers are reported separately so that case reads as
 *                       ROWS_UNPROVABLE and not as an empty ledger.
 *   wallets reconciled  wallets whose walked chain was compared with the wallet
 *                       row it has to end at. Conservation is a statement about
 *                       wallets; rows that reach no wallet prove none of it.
 *   audit rows paired   transaction rows matched to a wallet_audit_log row. The
 *                       number of FIELD comparisons those pairings made is
 *                       reported beside it but deliberately NOT floored: the
 *                       four audit balance columns are nullable
 *                       (walletAuditLog.ts:66-88) and a flow-only row
 *                       legitimately compares none of them, so a floor there
 *                       would fire on a legitimate shape and be waived — which
 *                       is worse than not having it.
 *
 * --min-rows, --min-wallets and --min-audit-pairs move the floors. They DEFAULT
 * TO 1, which is the strict setting: the floor is on unless someone turns it
 * off, and turning one off is `--min-rows 0`, typed out. A waived floor is never
 * silent — check 0 then reports WARN and names what was waived, because "the
 * operator switched this off" and "this passed" must not look the same.
 *
 * IN `--against` MODE THE FLOOR IS A FLOOR ON NEW ROWS. The window is defined by
 * the snapshot's watermark (windowClause below), so every row examined is by
 * construction a row written SINCE the snapshot, and "rows compared" is the
 * subset of those that carried a chain. There is no separate --min-new-rows
 * because it would be the same number: what the lane wants to assert is that the
 * load it just drove produced at least N chained rows, and that is --min-rows.
 *
 * AN EMPTY WINDOW AND AN EMPTY LEDGER ARE DIFFERENT FINDINGS. In `--against`
 * mode a run that compared nothing is one of two things and the snapshot's own
 * row counts tell them apart: WINDOW_EMPTY (the ledger already held rows when
 * the snapshot was taken and not one has been written since — the load did not
 * run, or ran somewhere else) or LEDGER_EMPTY (there were no rows then either —
 * nothing has ever been written here). The remedy is different in each case, so
 * the code and the sentence are different in each case. A snapshot too old to
 * carry counts cannot tell them apart and says so (WINDOW_EMPTY_LEDGER_UNKNOWN)
 * instead of guessing.
 *
 * CHECK 0 DOES NOT TOUCH THE ABSENT-VERSUS-FAIL DISTINCTION. A missing archive
 * table, a missing tombstone on an install with no archive, and absent M-014
 * columns are still ABSENT/UNPROVABLE rather than failures: those are questions
 * this install cannot be asked. Check 0 is about the ROWS, which every install
 * can be asked for, and it counts what was COMPARED — not what exists.
 *
 * Run:
 *   node scripts/ledger-conservation.mjs --self-test        (the judge, no database)
 *   node scripts/ledger-conservation.mjs --db v5_perf_probe
 *   node scripts/ledger-conservation.mjs --db v5_perf_probe --snapshot before.json
 *   ... drive the load ...
 *   node scripts/ledger-conservation.mjs --db v5_perf_probe --against before.json --scylla --keyspace trading_perf
 *
 * Red run: E.SCALE.3 (an injected credit row with a chain that matches nothing).
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromBackend = createRequire(path.join(ROOT, "backend", "package.json"));
const mysql = requireFromBackend("mysql2/promise");
const { config: loadDotenv } = requireFromBackend("dotenv");
loadDotenv({ path: path.join(ROOT, ".env"), quiet: true });

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    db: null,
    snapshot: null,
    against: null,
    scylla: false,
    keyspace: null,
    strict: false,
    json: null,
    cap: 20,
    // The floors of check 0. 1 is the strict setting and the default: a run that
    // compared nothing must not be able to print GREEN without someone having
    // typed `--min-rows 0` and read what that means.
    minRows: 1,
    minWallets: 1,
    minAuditPairs: 1,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) usage(`${a} needs a value`);
      return v;
    };
    if (a === "--db") args.db = next();
    else if (a === "--snapshot") args.snapshot = next();
    else if (a === "--against") args.against = next();
    else if (a === "--scylla") args.scylla = true;
    else if (a === "--keyspace") args.keyspace = next();
    else if (a === "--strict") args.strict = true;
    else if (a === "--json") args.json = next();
    else if (a === "--cap") args.cap = Number(next());
    else if (a === "--min-rows") args.minRows = floorArg(next(), a);
    else if (a === "--min-wallets") args.minWallets = floorArg(next(), a);
    else if (a === "--min-audit-pairs") args.minAuditPairs = floorArg(next(), a);
    else if (a === "--help" || a === "-h") args.help = true;
    else usage(`unknown argument ${a}`);
  }
  return args;
}

/**
 * A floor is a whole number of rows, so `--min-rows 25.5` and `--min-rows lots`
 * are usage errors rather than NaN. `NaN < 25` is false, so a mistyped floor
 * would quietly switch check 0 OFF and leave the run printing GREEN over
 * nothing — which is the exact bug check 0 exists to prevent, arriving through
 * its own argument parser.
 */
function floorArg(raw, flag) {
  const text = String(raw).trim();
  // Number("") is 0, and 0 is the waiver: an EMPTY argument must not be a way
  // to turn the floor off without saying so.
  const n = text === "" ? NaN : Number(text);
  if (!Number.isInteger(n) || n < 0) {
    usage(`${flag} needs a whole number of rows, 0 or more, not '${raw}'`);
  }
  return n;
}

function usage(reason) {
  if (reason) console.error(`ledger-conservation: ${reason}`);
  console.error(
    [
      "usage: node scripts/ledger-conservation.mjs --db <name containing probe or test>",
      "         [--snapshot <file>] [--against <file>] [--scylla] [--keyspace <ks>] [--strict] [--json <file>] [--cap N]",
      "         [--min-rows N] [--min-wallets N] [--min-audit-pairs N]",
      "   or: node scripts/ledger-conservation.mjs --self-test        (checks the check-0 judge; no database)",
      "  --db         the CLONE to read. Refused unless the lower-cased name contains 'probe' or 'test'.",
      "               Defaults to DB_NAME from .env, which is the live database and is therefore refused.",
      "  --snapshot   write the per-wallet baseline and row watermark to <file>, then exit 0.",
      "  --against    check only the rows written since the snapshot in <file>, from its baseline.",
      "  --scylla     also check inOrder against OPEN orders and resting stops in the Scylla keyspace.",
      "  --keyspace   Scylla keyspace (default SCYLLA_KEYSPACE from .env, then 'trading').",
      "  --strict     UNPROVABLE rows (no chain fields) fail instead of warn.",
      "  --min-rows   check 0: the run must have COMPARED at least N transaction rows (default 1).",
      "               0 waives that floor and is reported as a waiver, never as a pass.",
      "  --min-wallets      check 0: at least N wallets reconciled against their chain (default 1).",
      "  --min-audit-pairs  check 0: at least N transaction rows paired with an audit row (default 1).",
      "  --self-test  run check 0's judge against fixtures and exit. Must be the only argument.",
    ].join("\n")
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The allowlist
// ---------------------------------------------------------------------------

function isDisposableName(name) {
  const folded = String(name ?? "").toLowerCase();
  return folded.includes("probe") || folded.includes("test");
}

function refuse(name, how) {
  console.error(
    `REFUSING to run against \`${name}\` (${how}): the name must contain 'probe' or 'test', ` +
      `case-insensitively (@@lower_case_table_names is 1 here, so V5 and v5 are one database). ` +
      `Pass --db <clone>. This is an allowlist, not a denylist, because a denylist only refuses ` +
      `the names someone thought to list, and one typo away from a listed name is the live ledger.`
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Exact arithmetic: DECIMAL(36,18) strings become BigInt scaled by 1e18.
// Floats cannot hold a 2.8e10 sum to 1e-8 (measured FIAT total on the clone
// is 28,000,274,434.58), so nothing below is a Number.
// ---------------------------------------------------------------------------

const SCALE = 18;
const ONE = 10n ** BigInt(SCALE);
/** money.ts:114 rounds to 8 places: finer than any configured precision, coarser than float noise. */
const TOL = 10n ** BigInt(SCALE - 8);

function dec(value) {
  if (value === null || value === undefined) return null;
  let s = String(value).trim();
  if (s === "" || s === "null") return null;
  let neg = false;
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  // Exponent forms never come out of a DECIMAL column, but JSON metadata can
  // carry one (JSON.stringify(1e-7) is "1e-7"); the SQL side CASTs those to
  // DECIMAL first, so this is a belt for the braces.
  if (/e/i.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    s = n.toFixed(SCALE);
  }
  if (!/^\d*(\.\d*)?$/.test(s)) return null;
  const [intPart, fracPart = ""] = s.split(".");
  const frac = (fracPart + "0".repeat(SCALE)).slice(0, SCALE);
  const v = BigInt(intPart || "0") * ONE + BigInt(frac || "0");
  return neg ? -v : v;
}

function fmt(v) {
  if (v === null || v === undefined) return "";
  const neg = v < 0n;
  const a = neg ? -v : v;
  const intPart = a / ONE;
  const frac = (a % ONE).toString().padStart(SCALE, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${intPart}${frac ? "." + frac : ""}`;
}

function abs(v) {
  return v < 0n ? -v : v;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const results = [];

function report(check) {
  results.push(check);
  const tag = check.status.padEnd(10);
  console.log(`\n[${tag}] ${check.id} ${check.title}`);
  if (check.summary) console.log(`  ${check.summary}`);
  if (check.table && check.table.length) printTable(check.table);
  const sets = check.offenderSets ?? (check.offenders ? [{ label: "offending rows", rows: check.offenders }] : []);
  for (const set of sets) {
    if (!set.rows.length) continue;
    console.log(`  ${set.label} (${Math.min(set.rows.length, check.cap)} of ${set.rows.length}):`);
    printTable(set.rows.slice(0, check.cap));
  }
}

function printTable(rows) {
  const cols = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  const cell = (v) => (v === null || v === undefined ? "" : typeof v === "bigint" ? fmt(v) : String(v));
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => cell(r[c]).length)));
  const line = (vals) => "  " + vals.map((v, i) => v.padEnd(widths[i])).join("  ");
  console.log(line(cols));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const r of rows) console.log(line(cols.map((c) => cell(r[c]))));
}

// ---------------------------------------------------------------------------
// Sources: the live table, or live UNION ALL archive when the archive exists
// ---------------------------------------------------------------------------

/**
 * The string columns are collated to utf8mb4_bin on both sides of the union.
 * An install whose `transaction` table predates the utf8mb4_unicode_ci
 * schema default (the clones here: general_ci) and an archive table created
 * from the model (unicode_ci) refuse to UNION otherwise ("Illegal mix of
 * collations"); the bytes are the same either way, and nothing below compares
 * strings case-insensitively.
 */
const bin = (col) => `${col} COLLATE utf8mb4_bin AS ${col}`;
const TX_COLUMNS = [
  bin("id"), bin("walletId"), bin("userId"), bin("type"), bin("status"), "amount", "fee",
  bin("referenceId"), bin("idempotencyKey"), "createdAt", "deletedAt", bin("metadata"),
].join(", ");
const AUDIT_COLUMNS = [
  bin("id"), bin("transactionId"), bin("operation"), bin("walletId"), "amount", "previousBalance", "newBalance",
  "previousInOrder", "newInOrder", bin("idempotencyKey"), "createdAt",
].join(", ");

/**
 * Which archive tables the schema has. Both or neither is the expected
 * answer; one without the other is reported and treated as absent, because a
 * union over half a ledger would judge the other half wrongly.
 */
async function detectArchive(conn, db) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('transaction_archive', 'wallet_audit_log_archive')`,
    [db]
  );
  const names = new Set(rows.map((r) => r.name));
  const tx = names.has("transaction_archive");
  const audit = names.has("wallet_audit_log_archive");
  if (tx !== audit) {
    console.log(`archive: only ${tx ? "transaction_archive" : "wallet_audit_log_archive"} exists; reading the live tables alone`);
    return { present: false, transactions: 0, audit: 0 };
  }
  if (!tx) return { present: false, transactions: 0, audit: 0 };
  const [[counts]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM transaction_archive) AS transactions, (SELECT COUNT(*) FROM wallet_audit_log_archive) AS audit`
  );
  return { present: true, transactions: Number(counts.transactions), audit: Number(counts.audit) };
}

/**
 * The six typed chain columns M-014 adds to `transaction`. `transaction_archive` never has them
 * (it predates M-014 and the archive is a copy of the pre-M-014 shape), so the union selects NULL
 * on that side and those rows fall back to the `metadata` JSON.
 */
const CHAIN_COLUMNS = ["flow", "operationType", "previousBalance", "newBalance", "previousInOrder", "newInOrder"];

/** Which of CHAIN_COLUMNS `transaction` actually has. Absent is normal before M-014. */
async function detectChainColumns(conn, db) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transaction' AND COLUMN_NAME IN (?)`,
    [db, CHAIN_COLUMNS]
  );
  const found = CHAIN_COLUMNS.filter((c) => rows.some((r) => r.name === c));
  return { present: found.length === CHAIN_COLUMNS.length, found };
}

/**
 * Whether `ledger_key_tombstone` exists and what it holds. M-041.
 *
 * The row count is reported whatever it is: a tombstone check that ran against an empty table
 * proves nothing, and the difference between "no archived key was replayed" and "the tombstone was
 * never consulted" has to be visible in the output.
 */
async function detectTombstone(conn, db) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ledger_key_tombstone'`,
    [db]
  );
  if (!rows.length) return { present: false, rows: 0 };
  const [[counts]] = await conn.query(`SELECT COUNT(*) AS n FROM ledger_key_tombstone`);
  return { present: true, rows: Number(counts.n) };
}

/** The transaction column list, with the typed chain columns when the live table has them. */
function txColumns(chain, side) {
  if (!chain.present) return TX_COLUMNS;
  const extra = CHAIN_COLUMNS.map((c) =>
    side === "archive" ? `NULL AS \`${c}\`` : `\`${c}\``
  ).join(", ");
  return `${TX_COLUMNS}, ${extra}`;
}

/** The transaction rows to walk: `transaction`, or live UNION ALL archive with one column list. */
function txSource(archive, chain = { present: false }) {
  if (!archive.present) return chain.present ? `(SELECT ${txColumns(chain, "live")} FROM transaction)` : "transaction";
  return `(SELECT ${txColumns(chain, "live")} FROM transaction UNION ALL SELECT ${txColumns(chain, "archive")} FROM transaction_archive)`;
}

function auditSource(archive) {
  if (!archive.present) return "wallet_audit_log";
  return `(SELECT ${AUDIT_COLUMNS} FROM wallet_audit_log UNION ALL SELECT ${AUDIT_COLUMNS} FROM wallet_audit_log_archive)`;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** The `metadata` JSON expression for one chain field. */
const META = {
  flow: `CASE WHEN JSON_VALID(t.metadata) THEN JSON_VALUE(t.metadata, '$.flow') END`,
  op: `CASE WHEN JSON_VALID(t.metadata) THEN JSON_VALUE(t.metadata, '$.operationType') END`,
  pb: `CASE WHEN JSON_VALID(t.metadata) THEN CAST(JSON_VALUE(t.metadata, '$.previousBalance') AS DECIMAL(36,18)) END`,
  nb: `CASE WHEN JSON_VALID(t.metadata) THEN CAST(JSON_VALUE(t.metadata, '$.newBalance') AS DECIMAL(36,18)) END`,
  pio: `CASE WHEN JSON_VALID(t.metadata) THEN CAST(JSON_VALUE(t.metadata, '$.previousInOrder') AS DECIMAL(36,18)) END`,
  nio: `CASE WHEN JSON_VALID(t.metadata) THEN CAST(JSON_VALUE(t.metadata, '$.newInOrder') AS DECIMAL(36,18)) END`,
};

/** Which typed column mirrors which chain field. */
const TYPED = {
  flow: "flow",
  op: "operationType",
  pb: "previousBalance",
  nb: "newBalance",
  pio: "previousInOrder",
  nio: "newInOrder",
};

/**
 * The chain columns to select.
 *
 * `flow`/`op`/`pb`/`nb`/`pio`/`nio` are the RESOLVED values every check downstream reads: the
 * typed M-014 column when the schema has it and the row carries it, else the `metadata` JSON. The
 * `m*` and `c*` aliases keep the two halves apart so check 1e can compare them; without the typed
 * columns the `c*` half is NULL and 1b reports that it had nothing to compare.
 */
function chainSelect(chain) {
  const resolved = Object.entries(META).map(([alias, json]) =>
    chain.present ? `COALESCE(t.\`${TYPED[alias]}\`, ${json}) AS ${alias}` : `${json} AS ${alias}`
  );
  const metaOnly = Object.entries(META).map(([alias, json]) => `${json} AS m_${alias}`);
  const columnOnly = Object.keys(META).map((alias) =>
    chain.present ? `t.\`${TYPED[alias]}\` AS c_${alias}` : `NULL AS c_${alias}`
  );
  return `
  t.id, t.walletId, t.userId, t.type, t.status, t.amount, t.fee, t.referenceId, t.idempotencyKey,
  DATE_FORMAT(t.createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt,
  (t.metadata IS NOT NULL AND JSON_VALID(t.metadata)) AS jsonOk,
  ${resolved.join(",\n  ")},
  ${metaOnly.join(",\n  ")},
  ${columnOnly.join(",\n  ")}
`;
}

/** WHERE fragment selecting the live rows of the window, plus its parameters. */
function windowClause(snapshot) {
  if (!snapshot) return { sql: "t.deletedAt IS NULL", params: [] };
  const { createdAt, idsAtWatermark } = snapshot.watermark;
  if (!createdAt) return { sql: "t.deletedAt IS NULL", params: [] };
  if (!idsAtWatermark.length) {
    return { sql: "t.deletedAt IS NULL AND t.createdAt > ?", params: [createdAt] };
  }
  const marks = idsAtWatermark.map(() => "?").join(",");
  return {
    sql: `t.deletedAt IS NULL AND (t.createdAt > ? OR (t.createdAt = ? AND t.id NOT IN (${marks})))`,
    params: [createdAt, createdAt, ...idsAtWatermark],
  };
}

async function loadWallets(conn) {
  const [rows] = await conn.query(
    `SELECT id, userId, type, currency, balance, inOrder, (deletedAt IS NOT NULL) AS deleted FROM wallet`
  );
  const wallets = new Map();
  for (const r of rows) {
    wallets.set(r.id, {
      id: r.id,
      userId: r.userId,
      type: r.type,
      currency: r.currency,
      balance: dec(r.balance) ?? 0n,
      inOrder: dec(r.inOrder) ?? 0n,
      deleted: Number(r.deleted) === 1,
    });
  }
  return wallets;
}

async function loadWindowRows(conn, snapshot, archive, chain = { present: false }) {
  const w = windowClause(snapshot);
  const [rows] = await conn.query(
    `SELECT ${chainSelect(chain)} FROM ${txSource(archive, chain)} t WHERE ${w.sql} ORDER BY t.walletId, t.createdAt, t.id`,
    w.params
  );
  return rows.map((r) => ({
    ...r,
    jsonOk: Number(r.jsonOk) === 1,
    amount: dec(r.amount) ?? 0n,
    fee: dec(r.fee) ?? 0n,
    pb: dec(r.pb),
    nb: dec(r.nb),
    pio: dec(r.pio),
    nio: dec(r.nio),
    m_pb: dec(r.m_pb),
    m_nb: dec(r.m_nb),
    m_pio: dec(r.m_pio),
    m_nio: dec(r.m_nio),
    c_pb: dec(r.c_pb),
    c_nb: dec(r.c_nb),
    c_pio: dec(r.c_pio),
    c_nio: dec(r.c_nio),
  }));
}

async function loadWindowAudit(conn, snapshot, archive) {
  const w = windowClause(snapshot);
  const [rows] = await conn.query(
    `SELECT a.id, a.transactionId, a.operation, a.walletId, a.amount, a.previousBalance, a.newBalance,
            a.previousInOrder, a.newInOrder
       FROM ${auditSource(archive)} a JOIN ${txSource(archive)} t ON t.id = a.transactionId
      WHERE ${w.sql}`,
    w.params
  );
  const byTx = new Map();
  for (const r of rows) {
    const list = byTx.get(r.transactionId) ?? [];
    list.push({
      ...r,
      amount: dec(r.amount),
      previousBalance: dec(r.previousBalance),
      newBalance: dec(r.newBalance),
      previousInOrder: dec(r.previousInOrder),
      newInOrder: dec(r.newInOrder),
    });
    byTx.set(r.transactionId, list);
  }
  return byTx;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

async function takeSnapshot(conn, db, file, archive) {
  const wallets = await loadWallets(conn);
  const [[wm]] = await conn.query(
    `SELECT DATE_FORMAT(MAX(createdAt), '%Y-%m-%d %H:%i:%s') AS createdAt FROM ${txSource(archive)} t`
  );
  let idsAtWatermark = [];
  if (wm.createdAt) {
    const [ids] = await conn.query(`SELECT id FROM ${txSource(archive)} t WHERE createdAt = ?`, [wm.createdAt]);
    idsAtWatermark = ids.map((r) => r.id);
  }
  const [[counts]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM transaction) AS transactions, (SELECT COUNT(*) FROM wallet_audit_log) AS audit`
  );
  const out = {
    takenAt: new Date().toISOString(),
    db,
    // createdAt is a second-resolution DATETIME (transaction.createdAt is `datetime`,
    // verified on the clone), so a row written in the watermark second is told apart
    // by id, not by time.
    watermark: { createdAt: wm.createdAt, idsAtWatermark },
    counts: {
      transactions: Number(counts.transactions),
      audit: Number(counts.audit),
      wallets: wallets.size,
      archivedTransactions: archive.transactions,
      archivedAudit: archive.audit,
    },
    wallets: {},
  };
  for (const w of wallets.values()) {
    out.wallets[w.id] = { userId: w.userId, type: w.type, currency: w.currency, balance: fmt(w.balance), inOrder: fmt(w.inOrder) };
  }
  writeFileSync(file, JSON.stringify(out));
  console.log(
    `snapshot written to ${file}: ${wallets.size} wallets, watermark ${wm.createdAt ?? "(empty table)"} ` +
      `with ${idsAtWatermark.length} row(s) in that second, ${out.counts.transactions} transaction rows`
  );
}

function readSnapshot(file) {
  const snap = JSON.parse(readFileSync(file, "utf8"));
  if (!snap || !snap.watermark || !snap.wallets) usage(`${file} is not a snapshot written by --snapshot`);
  return snap;
}

// ---------------------------------------------------------------------------
// Check 1: conservation
// ---------------------------------------------------------------------------

const FLOW_IN = "IN";
const FLOW_OUT = "OUT";
const FLOW_INTERNAL = "INTERNAL";

function hasChain(r) {
  return r.pb !== null || r.nb !== null || r.pio !== null || r.nio !== null;
}

function rowDelta(r) {
  const bal = r.pb !== null && r.nb !== null ? r.nb - r.pb : 0n;
  const io = r.pio !== null && r.nio !== null ? r.nio - r.pio : 0n;
  return { bal, io, total: bal + io };
}

function fits(r, bal, io) {
  if (r.pb !== null && abs(r.pb - bal) > TOL) return false;
  if (r.pio !== null && abs(r.pio - io) > TOL) return false;
  return true;
}

function checkConservation(wallets, rows, snapshot, cap, strict) {
  // Baseline: the snapshot's per-wallet state, or zero in whole-table mode.
  const baseline = (w) => {
    if (!snapshot) return { bal: 0n, io: 0n };
    const s = snapshot.wallets[w.id];
    return s ? { bal: dec(s.balance) ?? 0n, io: dec(s.inOrder) ?? 0n } : { bal: 0n, io: 0n };
  };

  const byWallet = new Map();
  for (const r of rows) {
    const list = byWallet.get(r.walletId) ?? [];
    list.push(r);
    byWallet.set(r.walletId, list);
  }

  const groups = new Map(); // "TYPE/CUR" -> aggregate
  const groupOf = (w) => {
    const key = `${w.type}/${w.currency}`;
    let g = groups.get(key);
    if (!g) {
      g = { group: key, wallets: 0, touched: 0, baseline: 0n, now: 0n, legs: 0n, rows: 0, unprovable: 0, breaks: 0, tailMismatch: 0 };
      groups.set(key, g);
    }
    return g;
  };

  const breaks = [];
  const tails = [];
  const flowBad = [];
  const unprovable = [];
  const orphanRows = [];
  // Check 0's two counts. `rowsCompared` counts rows that entered the chain
  // walk, not rows that were read: a row with no chain fields, and a row naming
  // a wallet that does not exist, were both examined and neither was compared.
  let rowsCompared = 0;
  let walletsReconciled = 0;

  for (const w of wallets.values()) {
    const g = groupOf(w);
    const b = baseline(w);
    g.wallets += 1;
    g.baseline += b.bal + b.io;
    g.now += w.balance + w.inOrder;
  }

  for (const [walletId, list] of byWallet) {
    const w = wallets.get(walletId);
    if (!w) {
      for (const r of list) orphanRows.push({ id: r.id, walletId, type: r.type, amount: r.amount, reason: "wallet row missing" });
      continue;
    }
    const g = groupOf(w);
    g.touched += 1;
    let { bal, io } = baseline(w);

    const chainRows = [];
    for (const r of list) {
      g.rows += 1;
      if (!hasChain(r)) {
        g.unprovable += 1;
        unprovable.push({ id: r.id, wallet: `${w.type}/${w.currency}`, type: r.type, op: r.op, flow: r.flow, amount: r.amount, createdAt: r.createdAt });
        continue;
      }
      chainRows.push(r);
      const d = rowDelta(r);
      g.legs += d.total;

      // Flow versus the chain it sits beside. Written by the same code path in
      // the same JSON.stringify, so a disagreement is a hand-written row.
      let ok = true;
      if (r.flow === FLOW_INTERNAL) ok = abs(d.total) <= TOL;
      else if (r.flow === FLOW_IN) ok = abs(d.total - r.amount) <= TOL;
      else if (r.flow === FLOW_OUT) ok = abs(d.total + r.amount) <= TOL || abs(d.total + r.amount + r.fee) <= TOL;
      if (!ok) flowBad.push({ id: r.id, wallet: `${w.type}/${w.currency}`, type: r.type, op: r.op, flow: r.flow, amount: r.amount, fee: r.fee, chainDelta: d.total });
    }

    // Walk the chain. Rows are sorted by createdAt (second resolution) then id;
    // inside one second the id order is random, so the walk picks, among the
    // rows of that second, the one whose previous* matches the running state.
    // Two rows claiming the same previous state is the mint signature, and the
    // second of them breaks.
    let i = 0;
    while (i < chainRows.length) {
      let j = i;
      while (j < chainRows.length && chainRows[j].createdAt === chainRows[i].createdAt) j++;
      const pending = chainRows.slice(i, j);
      while (pending.length) {
        let idx = pending.findIndex((r) => fits(r, bal, io));
        const matched = idx !== -1;
        if (!matched) idx = 0;
        const r = pending.splice(idx, 1)[0];
        if (!matched) {
          g.breaks += 1;
          breaks.push({
            id: r.id,
            wallet: `${w.type}/${w.currency}`,
            walletId: w.id,
            type: r.type,
            op: r.op,
            flow: r.flow,
            createdAt: r.createdAt,
            runningBalance: bal,
            rowPreviousBalance: r.pb,
            runningInOrder: io,
            rowPreviousInOrder: r.pio,
          });
        }
        if (r.nb !== null) bal = r.nb;
        else if (r.pb !== null && r.nb === null) bal = r.pb;
        if (r.nio !== null) io = r.nio;
        else if (r.pio !== null && r.nio === null) io = r.pio;
      }
      i = j;
    }

    // A wallet counts as reconciled only when a chain was actually walked to
    // it. A wallet whose rows were all unprovable reaches the comparison below
    // with its baseline untouched, which compares the baseline against itself.
    if (chainRows.length) {
      rowsCompared += chainRows.length;
      walletsReconciled += 1;
    }

    if (abs(bal - w.balance) > TOL || abs(io - w.inOrder) > TOL) {
      g.tailMismatch += 1;
      tails.push({
        walletId: w.id,
        wallet: `${w.type}/${w.currency}`,
        rows: chainRows.length,
        chainEndsBalance: bal,
        walletBalance: w.balance,
        chainEndsInOrder: io,
        walletInOrder: w.inOrder,
        drift: w.balance + w.inOrder - bal - io,
      });
    }
  }

  // Wallets that moved without any row in the window (snapshot mode only:
  // whole-table mode has every wallet at zero baseline and reports it as a tail).
  if (snapshot) {
    for (const w of wallets.values()) {
      if (byWallet.has(w.id)) continue;
      const b = baseline(w);
      if (abs(b.bal - w.balance) > TOL || abs(b.io - w.inOrder) > TOL) {
        const g = groupOf(w);
        g.tailMismatch += 1;
        tails.push({
          walletId: w.id,
          wallet: `${w.type}/${w.currency}`,
          rows: 0,
          chainEndsBalance: b.bal,
          walletBalance: w.balance,
          chainEndsInOrder: b.io,
          walletInOrder: w.inOrder,
          drift: w.balance + w.inOrder - b.bal - b.io,
        });
      }
    }
  }

  const table = [];
  let groupFail = 0;
  for (const g of [...groups.values()].sort((a, b) => a.group.localeCompare(b.group))) {
    const moved = g.now - g.baseline;
    const drift = moved - g.legs;
    const provable = g.unprovable === 0;
    const pass = abs(drift) <= TOL && g.breaks === 0 && g.tailMismatch === 0;
    let status = pass ? "PASS" : "FAIL";
    if (!provable && pass) status = strict ? "FAIL" : "UNPROVABLE";
    if (status === "FAIL") groupFail += 1;
    if (snapshot && g.rows === 0 && g.tailMismatch === 0) continue; // untouched group in snapshot mode: nothing to say
    table.push({
      group: g.group,
      status,
      wallets: g.wallets,
      touched: g.touched,
      rows: g.rows,
      unprovable: g.unprovable,
      baseline: g.baseline,
      now: g.now,
      moved,
      legs: g.legs,
      drift,
      breaks: g.breaks,
      tailMismatch: g.tailMismatch,
    });
  }

  const status = groupFail || orphanRows.length ? "FAIL" : unprovable.length ? (strict ? "FAIL" : "WARN") : "PASS";
  report({
    id: "1",
    title: "CONSERVATION per wallet type and currency: SUM(balance + inOrder) moved by exactly the net of the legs",
    status,
    summary:
      `${snapshot ? "window since " + snapshot.watermark.createdAt : "whole table"}: ${rows.length} live rows over ${byWallet.size} wallets; ` +
      `${unprovable.length} row(s) carry no chain fields and prove nothing; ${orphanRows.length} row(s) name a wallet that does not exist.`,
    table,
    offenders: orphanRows,
    cap,
  });
  report({
    id: "1b",
    title: "CHAIN per wallet: every row's previousBalance/previousInOrder equals the running state, which ends at the wallet row",
    status: breaks.length || tails.length ? "FAIL" : "PASS",
    summary: `${breaks.length} broken link(s), ${tails.length} wallet(s) whose chain does not end where the wallet row is.`,
    offenderSets: [
      { label: "broken links: the row's previous state is not the running state", rows: breaks },
      { label: "chains that do not end at the wallet row", rows: tails },
    ],
    cap,
  });
  report({
    id: "1c",
    title: "FLOW agrees with the chain delta: IN is +amount, OUT is -amount or -(amount + fee), INTERNAL is 0",
    status: flowBad.length ? "FAIL" : "PASS",
    summary: `${flowBad.length} row(s) whose flow marker contradicts the balances written beside it.`,
    offenders: flowBad,
    cap,
  });
  report({
    id: "1d",
    title: "UNPROVABLE rows: no previous/new balance or inOrder in metadata, so no wallet delta is claimed",
    status: unprovable.length ? (strict ? "FAIL" : "WARN") : "PASS",
    summary:
      `${unprovable.length} row(s). Legacy rows, doors that bypass WalletService, and the ECO chain-transfer row ` +
      `(WalletService.ts:2740, trackers only) land here. --strict fails them.`,
    offenders: unprovable,
    cap,
  });
  return { rowsCompared, walletsReconciled };
}

// ---------------------------------------------------------------------------
// Check 1b: the M-014 typed columns mirror `metadata` (LEDGER CHAIN, invariant 5)
// ---------------------------------------------------------------------------

/**
 * Every row that carries both a typed column and its `metadata` twin must carry the same value in
 * each.
 *
 * The typed column is a mirror, added so a conservation walk is an index scan instead of a JSON
 * parse. It is only a mirror while the two agree; a row where they differ is a row on which half
 * the readers see one number and half the other, and neither half knows.
 *
 * With no M-014 columns on the table this reports UNPROVABLE and says how many rows it could not
 * compare. It never reports PASS in that case: a mirror that does not exist is not a mirror that
 * matches.
 */
function checkChainMirror(rows, chain, cap) {
  const text = ["flow", "op"];
  const amounts = ["pb", "nb", "pio", "nio"];
  const offenders = [];
  let compared = 0;
  let rowsWithColumns = 0;
  for (const r of rows) {
    let anyColumn = false;
    for (const field of text) {
      const column = r[`c_${field}`];
      const meta = r[`m_${field}`];
      if (column === null || column === undefined) continue;
      anyColumn = true;
      if (meta === null || meta === undefined) continue;
      compared++;
      if (String(column) !== String(meta)) {
        offenders.push({ id: r.id, column: TYPED[field], columnValue: String(column), metadataValue: String(meta) });
      }
    }
    for (const field of amounts) {
      const column = r[`c_${field}`];
      const meta = r[`m_${field}`];
      if (column === null || column === undefined) continue;
      anyColumn = true;
      if (meta === null || meta === undefined) continue;
      compared++;
      if (abs(column - meta) > TOL) {
        offenders.push({ id: r.id, column: TYPED[field], columnValue: fmt(column), metadataValue: fmt(meta) });
      }
    }
    if (anyColumn) rowsWithColumns++;
  }
  const status = !chain.present || compared === 0 ? "UNPROVABLE" : offenders.length ? "FAIL" : "PASS";
  report({
    id: "1e",
    title: "LEDGER CHAIN: the M-014 typed columns mirror the metadata they were backfilled from",
    status,
    summary:
      (chain.present
        ? `transaction carries all ${CHAIN_COLUMNS.length} M-014 columns; `
        : `transaction carries ${chain.found.length} of the ${CHAIN_COLUMNS.length} M-014 columns (${chain.found.join(", ") || "none"}), so the typed half was read as NULL and nothing could be compared; `) +
      `${rowsWithColumns} of ${rows.length} row(s) carry at least one typed column, ${compared} field(s) compared. ` +
      `metadata stays the contract (its key order is a wire diff); the column is the index-scannable twin.`,
    offenders,
    cap,
  });
}

// ---------------------------------------------------------------------------
// Check 2: credit-once (uniqueness)
// ---------------------------------------------------------------------------

async function checkUniqueness(conn, db, cap, archive, tombstone = { present: false, rows: 0 }) {
  // Across live and archive: a key that appears once in each is still a
  // credit paid twice, and the archive carries no UNIQUE index to refuse it.
  const [refDup] = await conn.query(
    `SELECT referenceId, COUNT(*) AS n, GROUP_CONCAT(id ORDER BY createdAt) AS ids
       FROM ${txSource(archive)} t WHERE deletedAt IS NULL AND referenceId IS NOT NULL AND referenceId <> ''
      GROUP BY referenceId HAVING n > 1 ORDER BY n DESC LIMIT ${cap + 1}`
  );
  const [keyDup] = await conn.query(
    `SELECT idempotencyKey, COUNT(*) AS n, GROUP_CONCAT(id ORDER BY createdAt) AS ids
       FROM ${txSource(archive)} t WHERE deletedAt IS NULL AND idempotencyKey IS NOT NULL AND idempotencyKey <> ''
      GROUP BY idempotencyKey HAVING n > 1 ORDER BY n DESC LIMIT ${cap + 1}`
  );
  const [auditDup] = await conn.query(
    `SELECT idempotencyKey, COUNT(*) AS n FROM ${auditSource(archive)} a
      GROUP BY idempotencyKey HAVING n > 1 ORDER BY n DESC LIMIT ${cap + 1}`
  );
  const [idx] = await conn.query(
    `SELECT TABLE_NAME AS tbl, INDEX_NAME AS idx, COLUMN_NAME AS col, NON_UNIQUE AS nonUnique
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND ((TABLE_NAME = 'transaction' AND COLUMN_NAME IN ('referenceId','idempotencyKey'))
         OR (TABLE_NAME = 'wallet_audit_log' AND COLUMN_NAME = 'idempotencyKey'))`,
    [db]
  );
  const unique = (tbl, col) => idx.some((r) => r.tbl === tbl && r.col === col && Number(r.nonUnique) === 0);
  // ------------------------------------------------------------------
  // M-041: the tombstone is the third place a key can be spent.
  // ------------------------------------------------------------------
  // 2b  An archived idempotencyKey with no tombstone is a key set free: the archive carries no
  //     UNIQUE index, so the moment the live row was hard-deleted that key became presentable
  //     again and the next PSP redelivery pays a second time.
  // 2c  A tombstone whose key (or referenceId) a LIVE row now holds is that replay, already
  //     committed. The pre-flight reads live rows AND tombstones precisely to refuse it.
  // The tombstone table is created at the schema default (utf8mb4_unicode_ci) and an upgraded
  // `transaction` may be utf8mb4_general_ci, so both sides of every key comparison are collated to
  // utf8mb4_bin — the same rule the UNION column lists above already apply, and for the same
  // reason: the bytes are the same either way and nothing here compares keys case-insensitively.
  let freedKeys = [];
  let replayedKeys = [];
  let replayedRefs = [];
  if (tombstone.present && archive.present) {
    [freedKeys] = await conn.query(
      `SELECT d.k AS idempotencyKey FROM (SELECT DISTINCT idempotencyKey AS k FROM transaction_archive
          WHERE idempotencyKey IS NOT NULL AND idempotencyKey <> '') d
         LEFT JOIN ledger_key_tombstone s ON s.idempotencyKey COLLATE utf8mb4_bin = d.k COLLATE utf8mb4_bin
        WHERE s.idempotencyKey IS NULL LIMIT ${cap + 1}`
    );
  }
  if (tombstone.present) {
    [replayedKeys] = await conn.query(
      `SELECT s.idempotencyKey, DATE_FORMAT(s.archivedAt, '%Y-%m-%d %H:%i:%s') AS archivedAt, t.id AS liveRow
         FROM ledger_key_tombstone s JOIN transaction t
              ON t.idempotencyKey COLLATE utf8mb4_bin = s.idempotencyKey COLLATE utf8mb4_bin
        WHERE t.deletedAt IS NULL LIMIT ${cap + 1}`
    );
    [replayedRefs] = await conn.query(
      `SELECT s.referenceId, DATE_FORMAT(s.archivedAt, '%Y-%m-%d %H:%i:%s') AS archivedAt, t.id AS liveRow
         FROM ledger_key_tombstone s JOIN transaction t
              ON t.referenceId COLLATE utf8mb4_bin = s.referenceId COLLATE utf8mb4_bin
        WHERE s.referenceId IS NOT NULL AND s.referenceId <> '' AND t.deletedAt IS NULL LIMIT ${cap + 1}`
    );
  }
  // 2d  Hard-deleted rows with nowhere to record their keys.
  const archiveWithoutTombstone = archive.present && !tombstone.present;

  const table = [
    { key: "transaction.referenceId", duplicates: refDup.length, uniqueIndex: unique("transaction", "referenceId") ? "present" : "MISSING" },
    { key: "transaction.idempotencyKey", duplicates: keyDup.length, uniqueIndex: unique("transaction", "idempotencyKey") ? "present" : "MISSING" },
    { key: "wallet_audit_log.idempotencyKey", duplicates: auditDup.length, uniqueIndex: unique("wallet_audit_log", "idempotencyKey") ? "present" : "MISSING" },
    {
      key: "ledger_key_tombstone (M-041)",
      duplicates: freedKeys.length + replayedKeys.length + replayedRefs.length,
      uniqueIndex: tombstone.present
        ? `present, ${tombstone.rows} headstone(s)`
        : archive.present
          ? "MISSING while transaction_archive EXISTS"
          : "absent (no archive either)",
    },
  ];
  const offenders = [
    ...refDup.map((r) => ({ key: "referenceId", value: r.referenceId, n: Number(r.n), ids: r.ids })),
    ...keyDup.map((r) => ({ key: "idempotencyKey", value: r.idempotencyKey, n: Number(r.n), ids: r.ids })),
    ...auditDup.map((r) => ({ key: "audit.idempotencyKey", value: r.idempotencyKey, n: Number(r.n), ids: "" })),
    ...freedKeys.map((r) => ({ key: "archived key with NO tombstone", value: r.idempotencyKey, n: 1, ids: "" })),
    ...replayedKeys.map((r) => ({ key: `tombstoned key REPLAYED live (archived ${r.archivedAt ?? "before M-041"})`, value: r.idempotencyKey, n: 1, ids: r.liveRow })),
    ...replayedRefs.map((r) => ({ key: `tombstoned referenceId REPLAYED live (archived ${r.archivedAt ?? "before M-041"})`, value: r.referenceId, n: 1, ids: r.liveRow })),
  ];
  const fail = offenders.length > 0 || table.some((t) => String(t.uniqueIndex).startsWith("MISSING")) || archiveWithoutTombstone;
  report({
    id: "2",
    title:
      "CREDIT-ONCE: referenceId and idempotencyKey unique over live rows" +
      (archive.present ? " and the archive" : "") +
      (tombstone.present ? " and the M-041 tombstone" : "") +
      ", and the UNIQUE indexes still exist",
    status: fail ? "FAIL" : "PASS",
    summary:
      "Soft-deleted rows are ignored: a deleted key legitimately replays, so counting it a duplicate would be a false positive." +
      (archive.present ? " Keys are grouped across live and archive; the indexes are checked on the live tables." : "") +
      (tombstone.present
        ? ` ${tombstone.rows} tombstone(s) consulted: ${freedKeys.length} archived key(s) with no headstone, ` +
          `${replayedKeys.length} tombstoned key(s) and ${replayedRefs.length} tombstoned referenceId(s) held by a live row. ` +
          `Idempotency here is GLOBAL, not per-table.`
        : archive.present
          ? " transaction_archive EXISTS and ledger_key_tombstone DOES NOT: rows have been hard-deleted with no record of the keys they consumed, so every archived key is presentable again."
          : " No archive and no tombstone table: those three questions were not asked, and are reported as not asked rather than as passed."),
    table,
    offenders,
    cap,
  });
}

// ---------------------------------------------------------------------------
// Check 3: audit row per wallet operation row
// ---------------------------------------------------------------------------

const AUDIT_OPS_FOR_FLOW = {
  [FLOW_IN]: new Set(["CREDIT", "TRANSFER_IN"]),
  [FLOW_OUT]: new Set(["DEBIT", "TRANSFER_OUT", "EXECUTE_FROM_HOLD"]),
  [FLOW_INTERNAL]: new Set(["HOLD", "RELEASE"]),
};

function checkAudit(rows, auditByTx, cap) {
  const missing = [];
  const extra = [];
  const disagree = [];
  let checked = 0;
  // Check 0's counts. `paired` is transaction rows that found an audit row;
  // `fields` is how many balance comparisons those pairings actually made,
  // which is reported beside it because the audit balance columns are nullable
  // and a pairing that compares nothing has proved nothing.
  let paired = 0;
  let fields = 0;
  for (const r of rows) {
    const serviceRow = r.flow !== null || hasChain(r);
    if (!serviceRow) continue;
    checked += 1;
    const audits = auditByTx.get(r.id) ?? [];
    if (audits.length === 0) {
      missing.push({ id: r.id, walletId: r.walletId, type: r.type, op: r.op, flow: r.flow, amount: r.amount, createdAt: r.createdAt });
      continue;
    }
    paired += 1;
    if (audits.length > 1) {
      extra.push({ id: r.id, type: r.type, flow: r.flow, auditRows: audits.length, operations: audits.map((a) => a.operation).join(",") });
    }
    const a = audits[0];
    const problems = [];
    if (r.flow && AUDIT_OPS_FOR_FLOW[r.flow] && !AUDIT_OPS_FOR_FLOW[r.flow].has(a.operation)) {
      problems.push(`operation ${a.operation} for flow ${r.flow}`);
    }
    if (a.walletId !== r.walletId) problems.push("walletId differs");
    // The audit columns are DECIMAL(30,18) (walletAuditLog.ts:63-88) while the
    // transaction row's copy is read out of JSON metadata and cast at
    // DECIMAL(36,18) (:342 above), so the audit side clamps; compare within
    // tolerance and only where both sides carry the field.
    const pairs = [
      ["previousBalance", r.pb, a.previousBalance],
      ["newBalance", r.nb, a.newBalance],
      ["previousInOrder", r.pio, a.previousInOrder],
      ["newInOrder", r.nio, a.newInOrder],
    ];
    for (const [name, txv, av] of pairs) {
      if (txv === null || av === null) continue;
      fields += 1;
      if (abs(txv - av) > TOL) problems.push(`${name} ${fmt(txv)} vs audit ${fmt(av)}`);
    }
    if (problems.length) disagree.push({ id: r.id, type: r.type, flow: r.flow, audit: a.operation, problems: problems.join("; ") });
  }
  report({
    id: "3",
    title: "AUDIT: one wallet_audit_log row per WalletService transaction row, agreeing on operation and balances",
    status: missing.length || extra.length || disagree.length ? "FAIL" : "PASS",
    summary:
      `${checked} service row(s) checked: ${missing.length} without an audit row, ${extra.length} with more than one, ` +
      `${disagree.length} disagreeing. ${paired} row(s) paired, and those pairings made ${fields} balance comparison(s) ` +
      `(the audit balance columns are nullable, so a pairing can compare none; check 0 floors the pairings and reports this).`,
    offenderSets: [
      { label: "transaction rows with no audit row", rows: missing },
      { label: "transaction rows with more than one audit row", rows: extra },
      { label: "audit rows that disagree with their transaction row", rows: disagree },
    ],
    cap,
  });
  return { checked, paired, fields };
}

// ---------------------------------------------------------------------------
// Check 4 (--scylla): inOrder equals the held share of OPEN orders and resting stops
// ---------------------------------------------------------------------------

async function checkInOrder(wallets, touchedWalletIds, keyspace, cap) {
  const { Client, auth } = requireFromBackend("cassandra-driver");
  const contactPoints = (process.env.SCYLLA_CONNECT_POINTS || "127.0.0.1:9042").split(",").map((p) => p.trim());
  const cfg = { contactPoints, localDataCenter: process.env.SCYLLA_DATACENTER || "datacenter1", keyspace };
  if (process.env.SCYLLA_USERNAME && process.env.SCYLLA_PASSWORD) {
    cfg.authProvider = new auth.PlainTextAuthProvider(process.env.SCYLLA_USERNAME, process.env.SCYLLA_PASSWORD);
  }
  const client = new Client(cfg);
  await client.connect();
  try {
    const expected = new Map(); // `${userId}|${walletType}|${currency}` -> BigInt
    const add = (userId, walletType, currency, v) => {
      const k = `${userId}|${walletType}|${currency}`;
      expected.set(k, (expected.get(k) ?? 0n) + v);
    };
    const big = (v) => (v === null || v === undefined ? 0n : BigInt(v.toString()));

    const open = await client.execute(
      `SELECT "userId", symbol, side, amount, remaining, cost, fee, "marketMakerId", "botId", "walletType" FROM ${keyspace}.orders WHERE status = 'OPEN' ALLOW FILTERING`,
      [],
      { prepare: true }
    );
    let skippedBots = 0;
    for (const o of open.rows) {
      if (o.marketMakerId || o.botId) {
        skippedBots += 1;
        continue;
      }
      const symbol = String(o.symbol ?? "");
      if (!symbol.includes("/")) continue;
      const [base, quote] = symbol.split("/");
      const walletType = o.walletType ? String(o.walletType) : "ECO";
      const amount = big(o.amount);
      const remaining = big(o.remaining);
      if (remaining <= 0n) continue;
      if (String(o.side).toUpperCase() === "BUY") {
        if (amount <= 0n) continue;
        add(o.userId.toString(), walletType, quote, ((big(o.cost) + big(o.fee)) * remaining) / amount);
      } else {
        add(o.userId.toString(), walletType, base, remaining);
      }
    }

    let stops = 0;
    for (const st of ["PENDING", "TRIGGERING", "CANCELLING"]) {
      const rs = await client.execute(
        `SELECT "userId", "reservedCurrency", "reservedAmount", "walletType" FROM ${keyspace}.stop_orders WHERE status = ? ALLOW FILTERING`,
        [st],
        { prepare: true }
      );
      for (const s of rs.rows) {
        if (!s.reservedCurrency || !(s.reservedAmount > 0)) continue;
        stops += 1;
        // reservedAmount is a DOUBLE (client.ts:494); 24.048 arrives as
        // 24.047999999999998. Eight places is the display precision the
        // reconcile script also settles on (reconcile-eco-inorder.mjs:41).
        add(s.userId.toString(), s.walletType ? String(s.walletType) : "ECO", String(s.reservedCurrency), dec(Number(s.reservedAmount).toFixed(8)));
      }
    }

    const offenders = [];
    const seen = new Set();
    let checked = 0;
    for (const w of wallets.values()) {
      if (w.type !== "ECO" && w.type !== "COPY_TRADING") continue;
      const key = `${w.userId}|${w.type}|${w.currency}`;
      if (!w.deleted) seen.add(key);
      if (w.deleted) continue;
      if (touchedWalletIds && !touchedWalletIds.has(w.id)) continue;
      checked += 1;
      const exp = expected.get(key) ?? 0n;
      if (abs(exp - w.inOrder) > TOL) {
        offenders.push({ walletId: w.id, wallet: `${w.type}/${w.currency}`, userId: w.userId, inOrder: w.inOrder, heldByOrders: exp, drift: w.inOrder - exp });
      }
    }
    // A hold for a wallet that does not exist is money reserved for nobody:
    // an order or stop whose user was deleted from under it (four such stops
    // sat in the dev keyspace on 2026-09-05), or a row written to the wrong
    // keyspace. Whole-table mode reports every one; window mode too, because
    // no wallet id can be attributed to a hold without a wallet.
    const orphans = [];
    for (const [key, held] of expected) {
      if (seen.has(key) || held === 0n) continue;
      const [userId, walletType, currency] = key.split("|");
      orphans.push({ userId, wallet: `${walletType}/${currency}`, heldByOrders: held, reason: "no live wallet row for this user, type and currency" });
    }
    report({
      id: "4",
      title: `IN-ORDER: ECO and COPY_TRADING inOrder equals the held share of OPEN orders and resting stops in ${keyspace}`,
      status: offenders.length || orphans.length ? "FAIL" : "PASS",
      summary:
        `${open.rows.length} OPEN order(s) (${skippedBots} bot or market-maker orders skipped), ${stops} resting stop(s); ` +
        `${checked} wallet(s) compared${touchedWalletIds ? " (only wallets with rows in the window)" : ""}; ` +
        `${orphans.length} hold(s) with no wallet to hold them.`,
      offenderSets: [
        { label: "wallets whose inOrder is not the held share of their open orders and stops", rows: offenders },
        { label: "holds with no wallet row", rows: orphans },
      ],
      cap,
    });
  } finally {
    await client.shutdown();
  }
}

// ---------------------------------------------------------------------------
// Check 0: the run compared enough rows for checks 1-4 to mean anything
// ---------------------------------------------------------------------------

/**
 * THE JUDGE, kept pure so `--self-test` can drive it: everything it needs is an
 * argument, and it reads no file, no clock and no database.
 *
 *   mode      "whole-table" or "window"
 *   counts    { rowsExamined, rowsCompared, walletsReconciled, auditPairs }
 *   floors    { rows, wallets, auditPairs }; 0 waives that one
 *   snapshot  window mode only: { takenAt, watermark, ledgerRowsAtSnapshot },
 *             where ledgerRowsAtSnapshot is live + archived rows AT THE TIME the
 *             snapshot was written, or null for a snapshot too old to carry
 *             counts
 *
 * Returns { ok, failures: [{ code, message }], waived }. Every failure carries a
 * CODE and not merely a sentence, because "the run refused" is not a finding:
 * "the ledger has never been written to", "the load wrote nothing into this
 * window" and "the window is full of rows that prove nothing" are three
 * different findings with three different remedies, and a caller (or a test)
 * has to be able to say WHICH refusal it got.
 *
 * When nothing was compared, only the root cause is reported. A zero wallet
 * count and a zero pairing count are CONSEQUENCES of an empty window, and three
 * failures where there is one problem teaches the reader to skim them.
 */
function floorVerdict({ mode, counts, floors, snapshot = null }) {
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });
  const waived = Object.entries(floors)
    .filter(([, v]) => v === 0)
    .map(([k]) => k);

  if (floors.rows > 0) {
    if (counts.rowsCompared === 0) {
      if (counts.rowsExamined > 0) {
        fail(
          "ROWS_UNPROVABLE",
          `${counts.rowsExamined} row(s) were examined and NOT ONE carried a chain, so nothing was ` +
            `compared and checks 1, 1b, 1c and 3 all passed over an empty set. A row with no ` +
            `previousBalance/newBalance claims no wallet delta (check 1d lists them one by one); a ` +
            `window made only of those is not a conservation proof. Point the run at rows ` +
            `WalletService wrote, or say so with --min-rows 0 and read check 1d instead.`
        );
      } else if (mode === "window") {
        const at = snapshot ? snapshot.ledgerRowsAtSnapshot : null;
        if (at === null || at === undefined) {
          fail(
            "WINDOW_EMPTY_LEDGER_UNKNOWN",
            `no row has been written since the snapshot, and the snapshot carries no row counts (it ` +
              `was written by an older --snapshot), so an empty WINDOW cannot be told from an empty ` +
              `LEDGER. Re-take the snapshot with this version rather than read anything into a green run.`
          );
        } else if (at === 0) {
          fail(
            "LEDGER_EMPTY",
            `the snapshot recorded 0 row(s) in the ledger and 0 have been written since: nothing has ` +
              `EVER been written here. This is an empty database, not a clean one, and every check ` +
              `above passed over zero rows.`
          );
        } else {
          fail(
            "WINDOW_EMPTY",
            `the ledger already held ${at} row(s) when the snapshot was taken` +
              `${snapshot.takenAt ? ` at ${snapshot.takenAt}` : ""} (watermark ` +
              `${snapshot.watermark ?? "empty table"}) and NOT ONE has been written since, so the ` +
              `window is empty and checks 1 to 3 compared nothing. The LEDGER is not empty — the LOAD ` +
              `is. Check that the driver ran, that it wrote to THIS database, and that the snapshot ` +
              `was taken BEFORE it and not after.`
          );
        }
      } else {
        fail(
          "LEDGER_EMPTY",
          `the whole-table walk examined 0 rows: \`transaction\` (with its archive, where that ` +
            `exists) is EMPTY. Every check above passed over nothing.`
        );
      }
    } else if (counts.rowsCompared < floors.rows) {
      fail(
        "ROWS_BELOW_FLOOR",
        `${counts.rowsCompared} row(s) were compared, below the floor of ${floors.rows} ` +
          `(${counts.rowsExamined} row(s) examined). The lane that set this floor expected more money ` +
          `to move than that, so a run that moved less has not exercised what the floor was ` +
          `calibrated against.`
      );
    }
  }

  if (floors.wallets > 0 && counts.walletsReconciled < floors.wallets) {
    if (counts.walletsReconciled === 0) {
      fail(
        "NO_WALLETS_RECONCILED",
        `${counts.rowsCompared} row(s) were compared but NOT ONE wallet's chain was walked to the ` +
          `wallet row it has to end at. Conservation is a statement about wallets; rows that name a ` +
          `wallet no \`wallet\` row matches are reported by check 1 as orphans, and nothing was proved ` +
          `about any balance.`
      );
    } else {
      fail(
        "WALLETS_BELOW_FLOOR",
        `${counts.walletsReconciled} wallet(s) were reconciled against their chain, below the floor ` +
          `of ${floors.wallets}. A run that touched fewer wallets than the lane expected did not drive ` +
          `what the lane thinks it drove.`
      );
    }
  }

  if (floors.auditPairs > 0 && counts.auditPairs < floors.auditPairs) {
    if (counts.auditPairs === 0) {
      fail(
        "NO_AUDIT_PAIRS",
        `no transaction row was paired with a wallet_audit_log row, so check 3 compared nothing. The ` +
          `audit write shares the wallet operation's own transaction (AuditLogger.ts:49-91), so ` +
          `"no pairings at all" means the audit table was never written — read check 3's missing list ` +
          `rather than its PASS.`
      );
    } else {
      fail(
        "AUDIT_PAIRS_BELOW_FLOOR",
        `${counts.auditPairs} transaction row(s) were paired with an audit row, below the floor of ` +
          `${floors.auditPairs}.`
      );
    }
  }

  // When NOTHING was compared, every floor above fails at once — a wallet count
  // of zero and a pairing count of zero are not three problems, they are one
  // problem counted three ways — so the first applicable finding is reported and
  // the rest are dropped as its consequences. The first one is whichever floor
  // is still switched on, which is why waiving --min-rows does not waive the
  // wallet floor with it: the cascade is trimmed, not turned off.
  const trimmed = counts.rowsCompared === 0 ? failures.slice(0, 1) : failures;
  return { ok: trimmed.length === 0, failures: trimmed, waived };
}

/**
 * How many rows the ledger held when the snapshot was written: live plus
 * archived, because they are one ledger (see LIVE AND ARCHIVE ARE ONE LEDGER
 * above). `null` for a snapshot written before --snapshot recorded counts —
 * reported as "cannot tell" rather than guessed at as zero, which would turn an
 * old snapshot into a fabricated LEDGER_EMPTY.
 */
function ledgerRowsAtSnapshot(snapshot) {
  const c = snapshot?.counts;
  if (!c || typeof c.transactions !== "number") return null;
  return c.transactions + (typeof c.archivedTransactions === "number" ? c.archivedTransactions : 0);
}

/** Run the judge, print check 0, and return its verdict. */
function reportFloor({ mode, counts, floors, snapshot, cap }) {
  const v = floorVerdict({ mode, counts, floors, snapshot });
  const shown = (n) => (n > 0 ? String(n) : "WAIVED (0)");
  const table = [
    {
      count: mode === "window" ? "transaction rows NEW since the snapshot" : "transaction rows examined",
      value: counts.rowsExamined,
      floor: "-",
    },
    { count: "rows COMPARED: chain walked against the running state", value: counts.rowsCompared, floor: shown(floors.rows) },
    { count: "wallets reconciled: chain walked to the wallet row", value: counts.walletsReconciled, floor: shown(floors.wallets) },
    { count: "transaction rows paired with an audit row", value: counts.auditPairs, floor: shown(floors.auditPairs) },
    { count: "audit field comparisons those pairings made", value: counts.auditFields, floor: "- (reported, not floored)" },
  ];
  if (mode === "window") {
    table.push({
      count: "rows in the ledger when the snapshot was taken",
      value: snapshot?.ledgerRowsAtSnapshot ?? "(snapshot carries no counts)",
      floor: "-",
    });
  }
  const headline =
    `${counts.rowsCompared} row(s) compared over ${counts.walletsReconciled} wallet(s), ` +
    `${counts.auditPairs} audit pairing(s) making ${counts.auditFields} field comparison(s).` +
    (v.waived.length
      ? ` FLOOR WAIVED by the operator: ${v.waived.join(", ")}. A waived floor is reported, never silent.`
      : "");
  report({
    id: "0",
    title: "FLOOR: the run compared enough rows for the checks above to mean anything",
    status: v.ok ? (v.waived.length ? "WARN" : "PASS") : "FAIL",
    summary: [headline, ...v.failures.map((f) => `${f.code}: ${f.message}`)].join("\n  "),
    table,
    cap,
  });
  return v;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage();
  const db = args.db ?? process.env.DB_NAME ?? "";
  if (!db) usage("no --db and no DB_NAME in .env");
  if (!isDisposableName(db)) refuse(db, "the --db argument");
  if (args.snapshot && args.against) usage("--snapshot and --against are exclusive");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: db,
    decimalNumbers: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
  try {
    // The server's own answer, not the argument: a rewrite or a default schema
    // on the account is exactly what an allowlist on the argument would miss.
    const [[{ resolved }]] = await conn.query(`SELECT DATABASE() AS resolved`);
    if (!isDisposableName(resolved)) refuse(resolved, "what the server resolved DATABASE() to");
    console.log(`ledger-conservation against \`${resolved}\` at ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306}`);

    const archive = await detectArchive(conn, resolved);
    console.log(
      archive.present
        ? `archive: transaction_archive (${archive.transactions} rows) and wallet_audit_log_archive (${archive.audit} rows) read as one ledger with the live tables`
        : "archive: no archive tables; reading the live tables alone"
    );
    const tombstone = await detectTombstone(conn, resolved);
    console.log(
      tombstone.present
        ? `tombstone: ledger_key_tombstone (${tombstone.rows} headstone(s)) read as the third place a key can be spent (M-041)`
        : archive.present
          ? "tombstone: ledger_key_tombstone is ABSENT while transaction_archive exists — every archived key is presentable again (M-041 not applied)"
          : "tombstone: no ledger_key_tombstone table and no archive; the archived-key questions are not asked"
    );
    const chain = await detectChainColumns(conn, resolved);
    console.log(
      chain.present
        ? `chain columns: transaction carries all ${CHAIN_COLUMNS.length} M-014 typed columns; they are read in preference to the metadata JSON and check 1e compares the two`
        : `chain columns: transaction carries ${chain.found.length} of the ${CHAIN_COLUMNS.length} M-014 typed columns (${chain.found.join(", ") || "none"}); the chain is read from metadata alone`
    );

    if (args.snapshot) {
      await takeSnapshot(conn, resolved, args.snapshot, archive);
      return 0;
    }

    const snapshot = args.against ? readSnapshot(args.against) : null;
    if (snapshot && snapshot.db && snapshot.db.toLowerCase() !== String(resolved).toLowerCase()) {
      usage(`snapshot ${args.against} was taken on \`${snapshot.db}\`, not \`${resolved}\``);
    }
    if (snapshot) console.log(`mode: window since snapshot ${snapshot.takenAt} (watermark ${snapshot.watermark.createdAt ?? "empty table"})`);
    else console.log("mode: whole table from a zero baseline (green only on a from-zero ledger; use --snapshot/--against on a clone of live data)");

    const wallets = await loadWallets(conn);
    const rows = await loadWindowRows(conn, snapshot, archive, chain);
    const auditByTx = await loadWindowAudit(conn, snapshot, archive);

    const conservation = checkConservation(wallets, rows, snapshot, args.cap, args.strict);
    checkChainMirror(rows, chain, args.cap);
    await checkUniqueness(conn, resolved, args.cap, archive, tombstone);
    const audit3 = checkAudit(rows, auditByTx, args.cap);

    if (args.scylla) {
      const keyspace = args.keyspace || process.env.SCYLLA_KEYSPACE || "trading";
      const touched = snapshot ? new Set(rows.map((r) => r.walletId)) : null;
      try {
        await checkInOrder(wallets, touched, keyspace, args.cap);
      } catch (e) {
        report({ id: "4", title: `IN-ORDER against Scylla keyspace ${keyspace}`, status: "FAIL", summary: `Scylla read failed: ${e?.message ?? e}`, cap: args.cap });
      }
    }

    // Check 0 last, because its counts come from the checks above it, and
    // numbered 0 because it is the precondition for every one of them: without
    // it, each of those PASSes is only "no offending row was found among the
    // rows I looked at", and nothing said how many rows that was.
    const counts = {
      rowsExamined: rows.length,
      rowsCompared: conservation.rowsCompared,
      walletsReconciled: conservation.walletsReconciled,
      auditPairs: audit3.paired,
      auditFields: audit3.fields,
    };
    const floors = { rows: args.minRows, wallets: args.minWallets, auditPairs: args.minAuditPairs };
    reportFloor({
      mode: snapshot ? "window" : "whole-table",
      counts,
      floors,
      snapshot: snapshot
        ? {
            takenAt: snapshot.takenAt ?? null,
            watermark: snapshot.watermark?.createdAt ?? null,
            ledgerRowsAtSnapshot: ledgerRowsAtSnapshot(snapshot),
          }
        : null,
      cap: args.cap,
    });

    const failed = results.filter((r) => r.status === "FAIL");
    const warned = results.filter((r) => r.status === "WARN" || r.status === "UNPROVABLE");
    console.log(
      `\n${failed.length ? "RED" : "GREEN"}: ${results.length - failed.length - warned.length} pass, ${warned.length} warn, ${failed.length} fail` +
        (failed.length ? ` (${failed.map((r) => r.id).join(", ")})` : "")
    );
    if (args.json) {
      writeFileSync(
        args.json,
        JSON.stringify(
          {
            db: resolved,
            mode: snapshot ? "window" : "whole-table",
            snapshot: args.against,
            archive,
            tombstone,
            chainColumns: chain,
            counts,
            floors,
            ranAt: new Date().toISOString(),
            results,
          },
          (_k, v) => (typeof v === "bigint" ? fmt(v) : v),
          2
        )
      );
      console.log(`results written to ${args.json}`);
    }
    return failed.length ? 1 : 0;
  } finally {
    await conn.end();
  }
}

// ---------------------------------------------------------------------------
// --self-test: check the judge of check 0, in milliseconds, against no database
// ---------------------------------------------------------------------------

/*
 * Check 0 is the part of this script that can fail SILENTLY. Weaken one
 * comparison in floorVerdict and every future run passes — and a passing run is
 * exactly what a healthy tree looks like, which is how the missing floor
 * survived here in the first place. Each case below is a mutation somebody could
 * plausibly make, asserted to still be caught, and each asserts WHICH refusal it
 * got rather than that a refusal happened: LEDGER_EMPTY and WINDOW_EMPTY have
 * different remedies, and a judge that returned either would pass a test that
 * only asked "did it fail?".
 *
 * The floors used below (25 rows, 4 wallets, 10 pairings) are PINNED at the
 * boundary, not straddled: every one is asserted at exactly the floor and at
 * exactly one under it, which is the off-by-one a `<`/`<=` slip inverts without
 * changing anything else.
 */
function selfTest() {
  const failures = [];
  let cases = 0;
  const check = (what, cond) => {
    cases += 1;
    if (!cond) failures.push(what);
  };

  /* The floors under test. Deliberately not 1: a floor of 1 cannot tell "at the
     floor" from "the only value above zero", so the boundary cases below would
     pass against a judge that merely refused zero. */
  const FLOORS = { rows: 25, wallets: 4, auditPairs: 10 };
  const counts = (over) => ({
    rowsExamined: 120,
    rowsCompared: 100,
    walletsReconciled: 12,
    auditPairs: 60,
    auditFields: 210,
    ...over,
  });
  const whole = (over, floors = FLOORS) =>
    floorVerdict({ mode: "whole-table", counts: counts(over), floors });
  const window_ = (over, snapshot, floors = FLOORS) =>
    floorVerdict({ mode: "window", counts: counts(over), floors, snapshot });
  const codes = (v) => v.failures.map((f) => f.code);
  const only = (v, code) => !v.ok && v.failures.length === 1 && v.failures[0].code === code;
  const nothing = { rowsExamined: 0, rowsCompared: 0, walletsReconciled: 0, auditPairs: 0, auditFields: 0 };

  // 1. A real run passes and says nothing was waived.
  const healthy = whole({});
  check("a run that compared 100 rows over 12 wallets must PASS", healthy.ok);
  check("a run with every floor set must report no waivers", healthy.waived.length === 0);

  // 2. THE FINDING: zero rows compared must FAIL, not print GREEN.
  const empty = whole(nothing);
  check("a whole-table run that compared ZERO rows must FAIL", !empty.ok);
  check("an empty whole-table run must name LEDGER_EMPTY and nothing else", only(empty, "LEDGER_EMPTY"));
  check(
    "an empty run must say the checks passed over nothing, not merely that it refused",
    /passed over nothing/i.test(empty.failures[0]?.message ?? "")
  );

  // 3. `--against` with nothing written since the snapshot is a DIFFERENT
  //    finding from a ledger that was never written to, and the snapshot's own
  //    row counts are what tell them apart.
  const idle = window_(nothing, { takenAt: "2026-09-09T10:00:00.000Z", watermark: "2026-09-09 09:59:58", ledgerRowsAtSnapshot: 4182 });
  const never = window_(nothing, { takenAt: "2026-09-09T10:00:00.000Z", watermark: null, ledgerRowsAtSnapshot: 0 });
  check("a --against run where the load wrote nothing must FAIL as WINDOW_EMPTY", only(idle, "WINDOW_EMPTY"));
  check("a --against run over a ledger that was never written must FAIL as LEDGER_EMPTY", only(never, "LEDGER_EMPTY"));
  check("the two empty --against runs must not share a code", codes(idle)[0] !== codes(never)[0]);
  check(
    "WINDOW_EMPTY must quote the rows the ledger already held, which is what distinguishes it",
    (idle.failures[0]?.message ?? "").includes("4182")
  );
  check(
    "an --against run against a countless older snapshot must refuse to guess which it is",
    only(window_(nothing, { takenAt: "2026-09-01T00:00:00.000Z", watermark: "2026-09-01 00:00:00", ledgerRowsAtSnapshot: null }), "WINDOW_EMPTY_LEDGER_UNKNOWN")
  );

  // 4. Rows examined is not rows compared. A window full of rows that carry no
  //    chain is not an empty ledger and must not be reported as one.
  const unprovable = whole({ rowsExamined: 900, rowsCompared: 0, walletsReconciled: 0, auditPairs: 0, auditFields: 0 });
  check("900 examined rows that prove nothing must FAIL as ROWS_UNPROVABLE", only(unprovable, "ROWS_UNPROVABLE"));
  check(
    "a floor read off rowsExamined instead of rowsCompared must FAIL here",
    !whole({ rowsExamined: 10000, rowsCompared: 3, walletsReconciled: 1, auditPairs: 1, auditFields: 4 }).ok
  );

  // 5. THE BOUNDARY, pinned on each of the three counts: exactly at the floor
  //    passes, exactly one under fails, with the code that names which count.
  check("rows exactly at the floor (25) must PASS", whole({ rowsCompared: 25 }).ok);
  check("rows one under the floor (24) must FAIL", only(whole({ rowsCompared: 24 }), "ROWS_BELOW_FLOOR"));
  check("wallets exactly at the floor (4) must PASS", whole({ walletsReconciled: 4 }).ok);
  check("wallets one under the floor (3) must FAIL", only(whole({ walletsReconciled: 3 }), "WALLETS_BELOW_FLOOR"));
  check("audit pairings exactly at the floor (10) must PASS", whole({ auditPairs: 10 }).ok);
  check("audit pairings one under the floor (9) must FAIL", only(whole({ auditPairs: 9 }), "AUDIT_PAIRS_BELOW_FLOOR"));

  // 6. Zero is its own finding on the wallet and pairing counts too: "fewer
  //    than the lane expected" and "not one at all" are different problems.
  check(
    "rows compared but no wallet reconciled must FAIL as NO_WALLETS_RECONCILED",
    only(whole({ walletsReconciled: 0 }), "NO_WALLETS_RECONCILED")
  );
  check(
    "rows compared but no audit pairing must FAIL as NO_AUDIT_PAIRS",
    only(whole({ auditPairs: 0 }), "NO_AUDIT_PAIRS")
  );

  // 7. One problem, one finding: an empty run must not also complain about the
  //    zero wallets and zero pairings that empty run necessarily has. But a run
  //    that DID compare rows and falls short on two counts has two findings, so
  //    the trim must be the cascade and not a cap on the list.
  check("an empty run reports the root cause once, not three consequences", empty.failures.length === 1);
  const twoShort = whole({ rowsCompared: 30, walletsReconciled: 2, auditPairs: 3 });
  check(
    "a run that compared rows and is short on TWO counts reports both",
    codes(twoShort).join(",") === "WALLETS_BELOW_FLOOR,AUDIT_PAIRS_BELOW_FLOOR"
  );

  // 8. Waivers. 0 turns a floor off; it must be reported, and it must not turn
  //    the OTHER floors off with it.
  const waivedRows = floorVerdict({ mode: "whole-table", counts: nothing, floors: { rows: 0, wallets: 4, auditPairs: 10 } });
  check("--min-rows 0 must not waive the wallet floor", only(waivedRows, "NO_WALLETS_RECONCILED"));
  check("a waived floor must be named in the verdict", waivedRows.waived.join(",") === "rows");
  check(
    "with rows AND wallets waived the pairing floor is what catches an empty run",
    only(floorVerdict({ mode: "whole-table", counts: nothing, floors: { rows: 0, wallets: 0, auditPairs: 10 } }), "NO_AUDIT_PAIRS")
  );
  const allWaived = floorVerdict({ mode: "whole-table", counts: nothing, floors: { rows: 0, wallets: 0, auditPairs: 0 } });
  check("waiving every floor lets an empty run through", allWaived.ok);
  check("waiving every floor is reported as three waivers", allWaived.waived.length === 3);

  // 9. THE DEFAULT IS THE STRICT ONE — asked of the argument parser rather than
  //    written out here, so a default changed in parseArgs cannot pass this.
  const defaults = parseArgs(["--db", "v5_probe"]);
  check(
    "the DEFAULT floors must refuse a run that compared nothing",
    !floorVerdict({
      mode: "whole-table",
      counts: nothing,
      floors: { rows: defaults.minRows, wallets: defaults.minWallets, auditPairs: defaults.minAuditPairs },
    }).ok
  );
  check(
    "the DEFAULT floors must let a real run through",
    floorVerdict({
      mode: "whole-table",
      counts: counts({}),
      floors: { rows: defaults.minRows, wallets: defaults.minWallets, auditPairs: defaults.minAuditPairs },
    }).ok
  );
  const raised = parseArgs(["--db", "v5_probe", "--min-rows", "500", "--min-wallets", "0"]);
  check("--min-rows must be read as a number", raised.minRows === 500);
  check("--min-wallets 0 must be readable as the waiver", raised.minWallets === 0);

  if (failures.length) {
    console.error(`ledger-conservation --self-test: ${failures.length} of ${cases} case(s) FAILED:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  /* A floor on the self-test itself, the same argument as check 0 one level up:
     delete the cases and this stops saying "the judge is sound" while still
     printing that it was. */
  if (cases < 31) {
    console.error(
      `ledger-conservation --self-test: only ${cases} case(s) ran, expected at least 31. Cases were ` +
        `removed without the count being reconsidered; a shrinking self-test is how a judge stops ` +
        `being checked while still printing that it was.`
    );
    process.exit(1);
  }
  console.log(`ledger-conservation --self-test: ${cases} case(s) passed (the check-0 judge is sound).`);
  process.exit(0);
}

const ARGV = process.argv.slice(2);
if (ARGV.includes("--self-test")) {
  /* Alone, because it touches no database and must not look like it checked
     one: `--db v5_perf_probe --self-test` printing "the judge is sound" is a
     green nobody asked for. */
  if (ARGV.length !== 1) usage("--self-test takes no other arguments; it reads no database");
  selfTest();
} else {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(`ledger-conservation: ${e?.stack ?? e}`);
      process.exit(2);
    }
  );
}
