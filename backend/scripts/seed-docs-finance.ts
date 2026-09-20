/**
 * seed-docs-finance.ts — plausible content for the FINANCE surfaces that
 * photographed empty.
 *
 * ===========================================================================
 * WHY THIS EXISTS
 * ===========================================================================
 * A documentation screenshot pass photographed 302 screens of this platform.
 * Twenty-three came back correct, complete and EMPTY — "No data available" over
 * a real table. An empty table teaches a reader nothing and makes the product
 * look dead. This script fills the FINANCE share of that list:
 *
 *   /admin/finance/transfer      transaction (OUTGOING_TRANSFER, PENDING)
 *   /admin/ecosystem/utxo        ecosystem_utxo (+ the ECO wallets they back)
 *   /admin/finance/order/futures futures.orders     (ScyllaDB)
 *   /admin/futures/position      futures.position   (ScyllaDB)
 *   /admin/futures               the risk dashboard, derived from both
 *   /forex/investment            forex_investment (Ava's own list)
 *   /admin/forex                 the forex dashboard, derived from the same rows
 *
 * Two routes on the list are NOT fixed here, because no row in any database can
 * fix them. Both are explained at the bottom of this comment.
 *
 * ===========================================================================
 * THE FOUR RULES THIS FILE OBEYS
 * ===========================================================================
 * 1. IT NEVER TOUCHES `johndoe3dmodeller@gmail.com`. That is the owner's real
 *    account. `assertSafe()` refuses to run if any persona id resolves to it,
 *    and every row written here hangs off one of the three @example.com
 *    personas created by `seed-docs-demo.ts`.
 *
 * 2. IDEMPOTENT AND REVERSIBLE. Every id is a deterministic UUID derived from a
 *    label in the `docs-finance:` namespace (`fid()`), so the script can name
 *    every row it has ever written and can never name anyone else's. A run
 *    starts by hard-deleting its own rows and then writes them fresh; `--undo`
 *    is that purge alone.
 *
 * 3. THE NUMBERS ADD UP, and the script proves it rather than asserting it.
 *    `verify()` re-reads what was STORED and re-derives every total. Four
 *    identities are checked, and a failure sets a non-zero exit code:
 *
 *      (a) TRANSFER WALLETS.  balance == SUM(ledger deltas).
 *          `delta` is stated per event because the platform's own rules are not
 *          uniform: a PENDING transfer has ALREADY debited the sender (the
 *          route debits inside the same DB transaction that writes the row and
 *          only then leaves it PENDING for the approval queue), a COMPLETED one
 *          debits the sender the GROSS amount and credits the receiver
 *          `amount - fee`, and a REJECTED one was refunded, so its net effect
 *          is zero.
 *
 *      (b) UTXO WALLETS.  SUM(UNSPENT + LOCKED utxo amounts) - balance
 *          == SUM(amount + fee of every withdrawal still in flight).
 *          Not "on-chain equals the ledger", because that is FALSE on a correct
 *          platform: a withdrawal debits the custodial ledger when it is
 *          queued, while the coins it will spend are still sitting unspent on
 *          the chain until the transaction is broadcast. The difference between
 *          the two numbers is exactly the in-flight withdrawals, and that is
 *          what is checked.
 *
 *      (c) FUTURES POSITIONS.  Every open position's `unrealizedPnl` is
 *          derived from ONE mark price per symbol:
 *              long : pnl = (mark - entry) * amount
 *              short: pnl = (entry - mark) * amount
 *          The admin dashboard inverts that same relation to print a mark price
 *          per position, so every row of a symbol shows the same mark and a
 *          reader can check it. Margin, return-on-margin and the distance to
 *          liquidation all follow from the row.
 *
 *      (d) FOREX.  account.balance ==
 *              openingCapital - SUM(ACTIVE principals) + SUM(COMPLETED profits)
 *          with `profit` SIGNED and equal to `amount * roiPercentage / 100`,
 *          which is how `forex/utils/cron.ts` settles. A COMPLETED investment
 *          has returned its principal; a CANCELLED or REJECTED one was refunded
 *          in full, so both are net zero.
 *
 * 4. IT SEEDS THE TABLE THE PAGE READS. Each block below names the route
 *    handler it was written against. Two of the seven are not in MySQL at all —
 *    the futures order and position lists read ScyllaDB
 *    (`futures.orders` / `futures.position`, keyspace from
 *    `SCYLLA_FUTURES_KEYSPACE`), which is why this script talks to two stores.
 *
 * ===========================================================================
 * FOUR THINGS THIS SCRIPT DELIBERATELY DOES NOT WRITE
 * ===========================================================================
 * Each of these would look like extra realism and would in fact be damage.
 *
 * (i) NO PLATFORM-FEE SWEEP. A real transfer calls `recordAdminProfit` ->
 *     `collectPlatformFee`, which CREDITS A LIVE SUPER-ADMIN WALLET and writes
 *     an `admin_profit` row. On this box that path can reach the owner's real
 *     account, which rule 1 forbids. The fee is therefore recorded where the
 *     page reads it — `transaction.fee` and `metadata.platformFee` — and is not
 *     swept anywhere. The transfer rows are internally exact; the platform
 *     revenue ledger simply does not know about them.
 *
 * (ii) NO WALLET LEDGER ROWS ON `seed-docs-demo`'s WALLETS. That script derives
 *      each of its wallets from an explicit ledger and its `--verify` asserts
 *      `txns.length === ledger.length`. One extra transaction on one of its
 *      wallets turns its verifier red. So every wallet DEBITED here is a wallet
 *      this script created; its wallets appear only as transfer DESTINATIONS,
 *      which a PENDING transfer never credits and which therefore write nothing.
 *      The same constraint is why the forex investments below carry no
 *      `FOREX_INVESTMENT` audit row: the real route attaches that row to the
 *      user's SPOT/USDT wallet, and on Ava that wallet belongs to
 *      `seed-docs-demo`. The forex money is modelled where the forex pages read
 *      it — inside `forex_account.balance` — and reconciles there.
 *
 * (iii) NO `futures_order_*` WALLET BREADCRUMBS. `futures/utils/reconciler.ts`
 *       and `reconciler-orders.ts` are driven by exactly those idempotency keys
 *       in the MySQL `transaction` table. Writing them would put two live
 *       reconcilers to work on synthetic rows. The futures orders and positions
 *       here are Scylla-only, which is also why they are stable: nothing sweeps
 *       them.
 *
 * (iv) NO FUTURES CANDLES OR ORDERBOOK. `markMonitor.sweepFuturesPositions()`
 *      re-marks every OPEN position every two seconds and can close or
 *      liquidate it — but `fairMarkPrice()` returns 0 for a symbol with nothing
 *      to read, and the sweep skips a position it cannot mark
 *      (`if (!(mark > 0)) continue`). Leaving those two tables empty is what
 *      keeps the seeded book from being liquidated out from under the
 *      screenshot. The mark prices used to compute P&L live in this file only.
 *
 * ===========================================================================
 * THE TWO ROUTES THIS SCRIPT CANNOT FIX
 * ===========================================================================
 * /admin/finance/exchange/balance
 *     `api/admin/finance/exchange/balance/index.get.ts` calls
 *     `ExchangeManager.startExchange()` and then `exchange.fetchBalance()`. It
 *     is a live ccxt call to the configured provider (Binance is the active row
 *     in `exchange`), filtered to assets with a non-zero free/used balance, and
 *     the page renders that array directly. There is no table behind it. On
 *     this box the credentials are rejected outright:
 *         binance {"code":-2015,"msg":"Invalid API-key, IP, or permissions"}
 *     so the page will keep showing "No Balances Found" until real, funded,
 *     IP-allowed exchange credentials are configured. No seed can change that.
 *
 * /forex/plan
 *     The capture was taken SIGNED OUT (`guest-forex-plan`), and
 *     `api/(ext)/forex/plan/index.get.ts` is `requiresAuth: true` — a signed-out
 *     request returns 401 ("Authentication Required: Missing session ID"), the
 *     store gets no plans, and the page renders "No plans found". The plans
 *     exist and are active; this script adds two more. Re-capture that route as
 *     a signed-in user and it fills. Making it fill for a guest is a product
 *     decision (open the endpoint, or give the page a public variant), not a
 *     data one.
 *
 * ===========================================================================
 * USAGE  (from C:/xampp/htdocs/v5/backend)
 * ===========================================================================
 *   seed:   npx tsx -r dotenv/config scripts/seed-docs-finance.ts dotenv_config_path=../.env
 *   undo:   npx tsx -r dotenv/config scripts/seed-docs-finance.ts dotenv_config_path=../.env --undo
 *   check:  npx tsx -r dotenv/config scripts/seed-docs-finance.ts dotenv_config_path=../.env --verify
 *
 * Run `seed-docs-demo.ts` FIRST — the three personas must exist. Re-running
 * `seed-docs-demo.ts` afterwards hard-deletes every transaction and wallet of
 * those users, this script's included, so re-run this one after it.
 */

import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { createHash } from "crypto";

// The futures order/position lists and the futures dashboard read ScyllaDB
// through the ecosystem extension. Imported defensively, exactly as the routes
// do, so a box without the extension degrades to "futures not seeded" instead
// of crashing the whole script.
let scylla: any = null;
let scyllaFuturesKeyspace: string | null = null;
let toBigInt: ((n: number) => bigint) | null = null;
let fromBigInt: ((v: bigint) => number) | null = null;
let scyllaLoadError: string | null = null;
/**
 * The engine's own liquidation thresholds, IMPORTED and never re-typed.
 *
 * `verifyFutures` uses `FULL` to refuse any open position the engine would
 * already have closed, and `PARTIAL / FULL` is the same at-risk line the admin
 * dashboard draws. Two copies of these numbers are two different books.
 */
let FULL_LIQ = 0.8;
let PARTIAL_LIQ = 0.6;
try {
  const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
  scylla = clientModule.default;
  scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;
  const chain = require("@b/api/(ext)/ecosystem/utils/blockchain");
  toBigInt = chain.toBigInt;
  fromBigInt = chain.fromBigInt;
  const liq = require("@b/api/(ext)/futures/utils/liquidation");
  FULL_LIQ = Math.abs(liq.FULL_LIQUIDATION_THRESHOLD);
  PARTIAL_LIQ = Math.abs(liq.PARTIAL_LIQUIDATION_THRESHOLD);
} catch (e: any) {
  scyllaLoadError = e?.message || "ecosystem extension not installed";
}

const MODE_UNDO = process.argv.includes("--undo");
const MODE_VERIFY = process.argv.includes("--verify");

/** The one account that must never be read, written or photographed. */
const FORBIDDEN_EMAIL = "johndoe3dmodeller@gmail.com";

const CUSTOMER_EMAIL = "ava.thornton@example.com";
const OPERATOR_EMAIL = "ops.demo@example.com";
const COUNTERPARTY_EMAIL = "liam.osei@example.com";

// ---------------------------------------------------------------------------
// Deterministic identity
// ---------------------------------------------------------------------------

/**
 * A stable UUID for a label, in the `docs-finance:` namespace.
 *
 * Deterministic ids are what make the purge honest: the script can enumerate
 * every row it has ever written without a marker column or a record of the
 * previous run. The version and variant nibbles are forced so the value passes
 * the models' `isUUID` validators AND the Cassandra driver's uuid parser.
 */
function fid(label: string): string {
  const h = createHash("sha256").update(`docs-finance:${label}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

const ref = (label: string) => `DOCS-FIN-${label}`;
const idem = (label: string) => `docs-finance:${label}`;

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;
const ago = (d: number, h = 0) => new Date(NOW - d * DAY - h * HOUR);
/** Months back, expressed in days, so nothing lands outside a chart window. */
const monthsAgo = (m: number, extraDays = 0) =>
  ago(Math.round(m * 30.4) + extraDays);

/** Round to `dp` places. DECIMAL(36,18) tolerates far more; screens do not. */
const money = (n: number, dp = 8) => Number(n.toFixed(dp));

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

let FAILURES = 0;
function check(ok: boolean, what: string, detail = "") {
  if (ok) {
    log(`  ok   ${what}${detail ? "  " + detail : ""}`);
  } else {
    FAILURES++;
    log(`  FAIL ${what}${detail ? "  " + detail : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Personas — looked up BY EMAIL, never derived.
//
// `seed-docs-demo.ts` owns these accounts and mints their ids from its own
// namespace. Deriving them here would encode that namespace in a second place
// and silently write orphan rows the day it changes.
// ---------------------------------------------------------------------------

interface Persona {
  id: string;
  email: string;
  label: string;
}
let AVA: Persona;
let LIAM: Persona;
let MORGAN: Persona;

async function loadPersonas() {
  const wanted = [
    { email: CUSTOMER_EMAIL, label: "ava" },
    { email: COUNTERPARTY_EMAIL, label: "liam" },
    { email: OPERATOR_EMAIL, label: "morgan" },
  ];
  const rows: any[] = await models.user.findAll({
    where: { email: wanted.map((w) => w.email) },
    attributes: ["id", "email"],
  });
  const byEmail = new Map(
    rows.map((r) => [String(r.email).toLowerCase(), r.id as string])
  );
  const missing = wanted.filter((w) => !byEmail.has(w.email));
  if (missing.length) {
    throw new Error(
      `REFUSING TO RUN: ${missing.map((m) => m.email).join(", ")} not found. ` +
        `Run scripts/seed-docs-demo.ts first.`
    );
  }
  const [a, l, m] = wanted.map((w) => ({
    id: byEmail.get(w.email)!,
    email: w.email,
    label: w.label,
  }));
  AVA = a;
  LIAM = l;
  MORGAN = m;
}

async function assertSafe() {
  const owner: any = await models.user.findOne({
    where: { email: FORBIDDEN_EMAIL },
    attributes: ["id", "email"],
    paranoid: false,
  });
  if (!owner) return;
  if ([AVA.id, LIAM.id, MORGAN.id].includes(owner.id)) {
    throw new Error(
      `REFUSING TO RUN: a demo persona resolves to ${FORBIDDEN_EMAIL}.`
    );
  }
}

// ===========================================================================
// A. THE TRANSFER APPROVAL QUEUE  ->  /admin/finance/transfer
// ===========================================================================
/**
 * WHY THIS PAGE WAS EMPTY, AND IT WAS NOT FOR WANT OF TRANSFERS.
 *
 * There are 151 `OUTGOING_TRANSFER` rows on this install and the page still
 * said "No data available". The page is a QUEUE:
 * `admin/finance/transfer/page.tsx` opens with
 * `initialFilters={{ status: "PENDING" }}` and sorts oldest-first, because its
 * job is the transfers waiting for a decision. Every existing row is COMPLETED.
 * Seeding more completed transfers would have produced rows in the database and
 * an unchanged screenshot.
 *
 * WHY EVERY TRANSFER HERE IS ECO <-> FUTURES. That is the pairing that
 * legitimately lands PENDING: `finance/transfer/index.post.ts` routes those
 * through `handlePendingTransfer`, which debits the sender and gates the credit
 * on `transferStatus === "COMPLETED"`. A SPOT->SPOT transfer settles instantly
 * and never reaches this queue at all.
 *
 * THE METADATA KEYS ARE NOT DECORATION. `targetWalletId`, `targetAmount` and
 * `toCurrency` are what the "to" column renders — without them the column
 * prints "Missing destination" in the destructive ink — and `fromWallet` /
 * `fromCurrency` / `toCurrency` are what
 * `admin/finance/transfer/[id]/index.put.ts` reads to settle. A row missing
 * them photographs as a transfer that cannot be approved.
 *
 * FEE: `settings.walletTransferFee` is 1 (per cent) on this install.
 * `transaction.amount` is the GROSS debit and the fee is inside it, so the
 * destination receives `amount - fee` (`totalDeducted = parsedAmount`,
 * `targetReceiveAmount = parsedAmount - transferFeeAmount`). That is why the
 * "Amount" and "to" columns differ by exactly the "Fee" column on every row.
 */

const TRANSFER_FEE_PCT = 1;
const feeOn = (amount: number) => money((amount * TRANSFER_FEE_PCT) / 100);

type TxStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";

interface LedgerEvent {
  key: string;
  kind: "DEPOSIT" | "TRANSFER_OUT" | "TRANSFER_IN";
  status: TxStatus;
  amount: number;
  /** The effect on this wallet's balance. Stated, never inferred. */
  delta: number;
  at: Date;
  /** Transfer legs only: the wallet key on the other side. */
  counterparty?: string;
  description: string;
}

interface WalletSpec {
  key: string;
  userId: () => string;
  who: string;
  type: "SPOT" | "ECO" | "FUTURES" | "FIAT";
  currency: string;
  createdAt: Date;
  ledger: LedgerEvent[];
}

/**
 * The three ECO/FUTURES wallet pairs the queue is built on, and every event on
 * each. `verify()` sums the `delta` column; the balance is never hand-written.
 */
function buildTransferWallets(): WalletSpec[] {
  const specs: WalletSpec[] = [
    { key: "tw:ava:eco:sol", userId: () => AVA.id, who: "ava", type: "ECO", currency: "SOL", createdAt: ago(64), ledger: [] },
    { key: "tw:ava:futures:sol", userId: () => AVA.id, who: "ava", type: "FUTURES", currency: "SOL", createdAt: ago(59), ledger: [] },
    { key: "tw:liam:eco:ton", userId: () => LIAM.id, who: "liam", type: "ECO", currency: "TON", createdAt: ago(76), ledger: [] },
    { key: "tw:liam:futures:ton", userId: () => LIAM.id, who: "liam", type: "FUTURES", currency: "TON", createdAt: ago(71), ledger: [] },
    { key: "tw:morgan:eco:usdt", userId: () => MORGAN.id, who: "morgan", type: "ECO", currency: "USDT", createdAt: ago(90), ledger: [] },
    { key: "tw:morgan:futures:usdt", userId: () => MORGAN.id, who: "morgan", type: "FUTURES", currency: "USDT", createdAt: ago(81), ledger: [] },
  ];
  const by = new Map(specs.map((s) => [s.key, s]));
  const push = (key: string, e: LedgerEvent) => by.get(key)!.ledger.push(e);

  // On-chain funding of the three ECO wallets. A FUTURES wallet is never
  // deposited into directly on this platform — it is funded by a transfer, and
  // the COMPLETED transfers below are what fund these three.
  push("tw:ava:eco:sol", { key: "sol-dep", kind: "DEPOSIT", status: "COMPLETED", amount: 480, delta: 480, at: ago(62), description: "Deposit of 480 SOL" });
  push("tw:liam:eco:ton", { key: "ton-dep", kind: "DEPOSIT", status: "COMPLETED", amount: 9000, delta: 9000, at: ago(74), description: "Deposit of 9000 TON" });
  push("tw:morgan:eco:usdt", { key: "musdt-dep", kind: "DEPOSIT", status: "COMPLETED", amount: 40000, delta: 40000, at: ago(88), description: "Deposit of 40000 USDT (BEP20)" });

  const TRANSFERS: Array<{
    key: string;
    from: string;
    to: string;
    amount: number;
    status: TxStatus;
    at: Date;
  }> = [
    { key: "sol-fund", from: "tw:ava:eco:sol", to: "tw:ava:futures:sol", amount: 300, status: "COMPLETED", at: ago(58) },
    { key: "sol-back", from: "tw:ava:futures:sol", to: "tw:ava:eco:sol", amount: 120, status: "COMPLETED", at: ago(31) },
    { key: "sol-rej", from: "tw:ava:eco:sol", to: "tw:ava:futures:sol", amount: 250, status: "REJECTED", at: ago(9) },
    { key: "sol-p1", from: "tw:ava:eco:sol", to: "tw:ava:futures:sol", amount: 60, status: "PENDING", at: ago(11) },
    { key: "sol-p2", from: "tw:ava:eco:sol", to: "tw:ava:futures:sol", amount: 90, status: "PENDING", at: ago(4) },
    { key: "sol-p3", from: "tw:ava:futures:sol", to: "tw:ava:eco:sol", amount: 45, status: "PENDING", at: ago(2) },

    { key: "ton-fund", from: "tw:liam:eco:ton", to: "tw:liam:futures:ton", amount: 4000, status: "COMPLETED", at: ago(70) },
    { key: "ton-p1", from: "tw:liam:futures:ton", to: "tw:liam:eco:ton", amount: 1250, status: "PENDING", at: ago(6) },
    { key: "ton-p2", from: "tw:liam:futures:ton", to: "tw:liam:eco:ton", amount: 300, status: "PENDING", at: ago(8) },
    { key: "ton-p3", from: "tw:liam:eco:ton", to: "tw:liam:futures:ton", amount: 800, status: "PENDING", at: ago(3) },
    { key: "ton-p4", from: "tw:liam:eco:ton", to: "tw:liam:futures:ton", amount: 150, status: "PENDING", at: ago(0, 12) },
    { key: "ton-proc", from: "tw:liam:eco:ton", to: "tw:liam:futures:ton", amount: 640, status: "PROCESSING", at: ago(1) },

    { key: "usdt-fund", from: "tw:morgan:eco:usdt", to: "tw:morgan:futures:usdt", amount: 15000, status: "COMPLETED", at: ago(80) },
    { key: "usdt-back", from: "tw:morgan:futures:usdt", to: "tw:morgan:eco:usdt", amount: 5000, status: "COMPLETED", at: ago(40) },
    { key: "usdt-p1", from: "tw:morgan:futures:usdt", to: "tw:morgan:eco:usdt", amount: 900, status: "PENDING", at: ago(14) },
    { key: "usdt-p2", from: "tw:morgan:eco:usdt", to: "tw:morgan:futures:usdt", amount: 7500, status: "PENDING", at: ago(5) },
    { key: "usdt-p3", from: "tw:morgan:futures:usdt", to: "tw:morgan:eco:usdt", amount: 2250, status: "PENDING", at: ago(0, 20) },
    { key: "usdt-p4", from: "tw:morgan:eco:usdt", to: "tw:morgan:futures:usdt", amount: 1200, status: "PENDING", at: ago(0, 3) },
  ];

  for (const t of TRANSFERS) {
    const source = by.get(t.from)!;
    const target = by.get(t.to)!;
    const f = feeOn(t.amount);

    push(t.from, {
      key: t.key,
      kind: "TRANSFER_OUT",
      status: t.status,
      amount: t.amount,
      // PENDING and PROCESSING have already debited the sender; REJECTED was
      // refunded, so its net effect on the wallet is zero.
      delta: t.status === "REJECTED" ? 0 : -t.amount,
      at: t.at,
      counterparty: t.to,
      description: `Transfer of ${t.amount} ${source.currency} to ${target.type} wallet`,
    });

    // Only a COMPLETED transfer has credited the destination. The incoming row
    // is written at settlement, not at creation, which is exactly why the queue
    // is built on the OUTGOING row.
    if (t.status === "COMPLETED") {
      push(t.to, {
        key: `${t.key}-in`,
        kind: "TRANSFER_IN",
        status: "COMPLETED",
        amount: money(t.amount - f),
        delta: money(t.amount - f),
        at: t.at,
        counterparty: t.from,
        description: `Transfer of ${money(t.amount - f)} ${target.currency} from ${source.type} wallet`,
      });
    }
  }

  return specs;
}

// ===========================================================================
// B. THE UTXO POOL  ->  /admin/ecosystem/utxo
// ===========================================================================
/**
 * `admin/ecosystem/utxo/index.get.ts` lists `ecosystemUtxo` joined to `wallet`
 * for the currency. The five rows already in that table are all SOFT-DELETED
 * and all belong to the owner's account, so the page is genuinely empty.
 *
 * AMOUNTS ARE IN STANDARD UNITS, NOT SATOSHIS. Every writer in
 * `ecosystem/utils/utxo.ts` stores `satoshiToStandardUnit(value, chain)`, and
 * the admin column renders `value.toFixed(8)` with no conversion. The legacy
 * rows on this box (3200; 2000000000) predate that, and they are why the column
 * looks ambiguous — these do not repeat the mistake.
 *
 * THE WALLETS CARRY NO `address`. `btcDepositScanner` walks every ECO/BTC
 * wallet and skips the ones without one (`if (!wallet.address) continue`), so
 * an addressless wallet is invisible to it. A wallet holding a made-up address
 * would instead have a cron querying a blockchain provider for it forever.
 *
 * NO `CONSOLIDATION` ORIGIN. A consolidation spends several platform outputs
 * and pays a miner fee without moving any user's ledger balance, so it breaks
 * identity (b) by exactly that fee. Representing it honestly needs an
 * operating-cost account this seed does not model; DEPOSIT / CHANGE / SYNC
 * cover the states the page actually shows.
 */

interface UtxoSpec {
  key: string;
  amount: number;
  status: "UNSPENT" | "LOCKED" | "SPENT";
  origin: "DEPOSIT" | "CHANGE" | "SYNC";
  index: number;
  at: Date;
}

interface UtxoWithdrawal {
  key: string;
  status: "COMPLETED" | "PENDING" | "PROCESSING";
  amount: number;
  minerFee: number;
  at: Date;
}

interface UtxoWalletSpec {
  key: string;
  userId: () => string;
  who: string;
  currency: string;
  createdAt: Date;
  utxos: UtxoSpec[];
  withdrawals: UtxoWithdrawal[];
  /** Ledger credits. One per DEPOSIT- or SYNC-origin output. */
  deposits: Array<{ key: string; amount: number; at: Date; utxoKey: string }>;
}

function buildUtxoWallets(): UtxoWalletSpec[] {
  return [
    {
      key: "uw:ava:eco:btc",
      userId: () => AVA.id,
      who: "ava",
      currency: "BTC",
      createdAt: ago(120),
      utxos: [
        // Reserved by the in-flight withdrawal below.
        { key: "abtc-1", amount: 0.045, status: "LOCKED", origin: "DEPOSIT", index: 0, at: ago(96) },
        // Spent by the completed withdrawal, which produced abtc-4 as change.
        { key: "abtc-2", amount: 0.12, status: "SPENT", origin: "DEPOSIT", index: 1, at: ago(74) },
        { key: "abtc-3", amount: 0.0075, status: "UNSPENT", origin: "SYNC", index: 0, at: ago(41) },
        { key: "abtc-4", amount: 0.06988, status: "UNSPENT", origin: "CHANGE", index: 1, at: ago(22) },
      ],
      withdrawals: [
        { key: "abtc-wd-1", status: "COMPLETED", amount: 0.05, minerFee: 0.00012, at: ago(22) },
        { key: "abtc-wd-2", status: "PENDING", amount: 0.03, minerFee: 0.00009, at: ago(1) },
      ],
      deposits: [
        { key: "abtc-dep-1", amount: 0.045, at: ago(96), utxoKey: "abtc-1" },
        { key: "abtc-dep-2", amount: 0.12, at: ago(74), utxoKey: "abtc-2" },
        { key: "abtc-dep-3", amount: 0.0075, at: ago(41), utxoKey: "abtc-3" },
      ],
    },
    {
      key: "uw:ava:eco:doge",
      userId: () => AVA.id,
      who: "ava",
      currency: "DOGE",
      createdAt: ago(110),
      utxos: [
        { key: "adoge-1", amount: 12500, status: "UNSPENT", origin: "DEPOSIT", index: 0, at: ago(88) },
        { key: "adoge-2", amount: 40000, status: "SPENT", origin: "DEPOSIT", index: 0, at: ago(60) },
        { key: "adoge-3", amount: 3250, status: "UNSPENT", origin: "DEPOSIT", index: 2, at: ago(35) },
        { key: "adoge-4", amount: 14997.5, status: "UNSPENT", origin: "CHANGE", index: 1, at: ago(18) },
      ],
      withdrawals: [
        { key: "adoge-wd-1", status: "COMPLETED", amount: 25000, minerFee: 2.5, at: ago(18) },
      ],
      deposits: [
        { key: "adoge-dep-1", amount: 12500, at: ago(88), utxoKey: "adoge-1" },
        { key: "adoge-dep-2", amount: 40000, at: ago(60), utxoKey: "adoge-2" },
        { key: "adoge-dep-3", amount: 3250, at: ago(35), utxoKey: "adoge-3" },
      ],
    },
    {
      key: "uw:liam:eco:btc",
      userId: () => LIAM.id,
      who: "liam",
      currency: "BTC",
      createdAt: ago(83),
      utxos: [
        { key: "lbtc-1", amount: 0.08, status: "UNSPENT", origin: "DEPOSIT", index: 0, at: ago(66) },
        { key: "lbtc-2", amount: 0.0125, status: "LOCKED", origin: "DEPOSIT", index: 1, at: ago(37) },
        { key: "lbtc-3", amount: 0.031, status: "UNSPENT", origin: "SYNC", index: 0, at: ago(12) },
      ],
      withdrawals: [
        { key: "lbtc-wd-1", status: "PROCESSING", amount: 0.01, minerFee: 0.00007, at: ago(0, 9) },
      ],
      deposits: [
        { key: "lbtc-dep-1", amount: 0.08, at: ago(66), utxoKey: "lbtc-1" },
        { key: "lbtc-dep-2", amount: 0.0125, at: ago(37), utxoKey: "lbtc-2" },
        { key: "lbtc-dep-3", amount: 0.031, at: ago(12), utxoKey: "lbtc-3" },
      ],
    },
    {
      key: "uw:morgan:eco:doge",
      userId: () => MORGAN.id,
      who: "morgan",
      currency: "DOGE",
      createdAt: ago(140),
      utxos: [
        { key: "mdoge-1", amount: 90000, status: "SPENT", origin: "DEPOSIT", index: 0, at: ago(101) },
        { key: "mdoge-2", amount: 5000, status: "UNSPENT", origin: "DEPOSIT", index: 1, at: ago(70) },
        { key: "mdoge-3", amount: 29997, status: "UNSPENT", origin: "CHANGE", index: 1, at: ago(29) },
      ],
      withdrawals: [
        { key: "mdoge-wd-1", status: "COMPLETED", amount: 60000, minerFee: 3, at: ago(29) },
      ],
      deposits: [
        { key: "mdoge-dep-1", amount: 90000, at: ago(101), utxoKey: "mdoge-1" },
        { key: "mdoge-dep-2", amount: 5000, at: ago(70), utxoKey: "mdoge-2" },
      ],
    },
  ];
}

/** A deterministic 64-hex transaction id for a label. */
const txHash = (label: string) =>
  createHash("sha256").update(`docs-finance:txid:${label}`).digest("hex");

/** A plausible P2PKH locking script, so no two outputs share one. */
const lockScript = (label: string) =>
  "76a914" +
  createHash("sha256")
    .update(`docs-finance:spk:${label}`)
    .digest("hex")
    .slice(0, 40) +
  "88ac";

// ===========================================================================
// C. THE FUTURES BOOK  ->  /admin/futures, /admin/futures/position,
//                          /admin/finance/order/futures
// ===========================================================================
/**
 * These three read ScyllaDB, not MySQL. `admin/futures/order/index.get.ts` and
 * `admin/futures/position/index.get.ts` call the ecosystem `getFiltered`
 * against `<SCYLLA_FUTURES_KEYSPACE>.orders` and `.position`; the dashboard
 * scans the same two tables and joins `futures_market` from MySQL by
 * `currency/pair`.
 *
 * VARINT COLUMNS HOLD 10^18 FIXED POINT — except `leverage`, which holds a
 * PLAIN INTEGER. `createPosition` binds it as
 * `String(Math.max(1, Math.floor(leverage)))`, and both admin lists had to be
 * fixed for de-scaling it into 1e-17. This script writes it the same way.
 *
 * ONE MARK PER SYMBOL. Every open position's `unrealizedPnl` below is
 * `(mark - entry) * amount` for a long and `(entry - mark) * amount` for a
 * short, from `MARKS`. The dashboard's at-risk panel inverts that exact
 * relation to print a mark price per position, so every row of a symbol shows
 * the same number — which is what makes the page checkable rather than merely
 * populated.
 *
 * LEVERAGE IS WHAT PUTS A POSITION AT RISK, NOT SIZE. The engine liquidates on
 * return on margin, `leverage * priceMove / entry`, so a row's risk is
 * independent of how big it is. The leverages here spread the book across all
 * three of the dashboard's risk bands with two positions genuinely at risk and
 * none past the 0.9 maintenance threshold — a position past it would already
 * have been liquidated, and a risk console showing one is a console nobody
 * would believe.
 */

const MARKS: Record<string, number> = {
  "BTC/USDT": 63437.5,
  "ETH/USDT": 3035.0,
  "SOL/USDT": 145.8,
  "MASH/USDT": 0.8242,
};

/** Markets this script creates. MASH/USDT already exists and is reused. */
const NEW_MARKETS = [
  {
    key: "mkt:btcusdt",
    currency: "BTC",
    pair: "USDT",
    isHot: true,
    isTrending: true,
    metadata: {
      precision: { amount: 3, price: 2 },
      limits: {
        amount: { min: 0.001, max: 500 },
        price: { min: 0.01, max: 0 },
        cost: { min: 5, max: 0 },
        leverage: "1,2,5,10,20,50,100",
      },
      taker: 0.05,
      maker: 0.02,
    },
  },
  {
    key: "mkt:ethusdt",
    currency: "ETH",
    pair: "USDT",
    isHot: false,
    isTrending: true,
    metadata: {
      precision: { amount: 2, price: 2 },
      limits: {
        amount: { min: 0.01, max: 5000 },
        price: { min: 0.01, max: 0 },
        cost: { min: 5, max: 0 },
        leverage: "1,2,5,10,20,25",
      },
      taker: 0.05,
      maker: 0.02,
    },
  },
  {
    key: "mkt:solusdt",
    currency: "SOL",
    pair: "USDT",
    isHot: true,
    isTrending: false,
    metadata: {
      precision: { amount: 1, price: 3 },
      limits: {
        amount: { min: 0.1, max: 50000 },
        price: { min: 0.001, max: 0 },
        cost: { min: 5, max: 0 },
        leverage: "1,2,5,10,20,25",
      },
      taker: 0.06,
      maker: 0.02,
    },
  },
];

interface PositionSpec {
  key: string;
  userId: () => string;
  symbol: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  amount: number;
  leverage: number;
  status: "OPEN" | "CLOSED" | "LIQUIDATED";
  createdAt: Date;
  updatedAt: Date;
  /** OPEN rows derive this from MARKS; terminal rows state the frozen value. */
  frozenPnl?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

function buildPositions(): PositionSpec[] {
  const A = () => AVA.id;
  const L = () => LIAM.id;
  const M = () => MORGAN.id;
  return [
    // ---- OPEN -------------------------------------------------------------
    { key: "pos:1", userId: A, symbol: "BTC/USDT", side: "BUY", entryPrice: 61000, amount: 0.4, leverage: 10, status: "OPEN", createdAt: ago(6), updatedAt: ago(0, 1), takeProfitPrice: 68000 },
    { key: "pos:2", userId: L, symbol: "BTC/USDT", side: "SELL", entryPrice: 62000, amount: 0.25, leverage: 20, status: "OPEN", createdAt: ago(5), updatedAt: ago(0, 1), stopLossPrice: 65200 },
    // 50x, and therefore the most at-risk row on the book: return on margin is
    // `leverage x priceMove / entry`, so this 1.34% adverse move has already
    // eaten 67% of the margin. The entry is chosen to keep it UNDER the
    // engine's own FULL_LIQUIDATION_THRESHOLD — `verifyFutures` imports that
    // constant and fails if any open row is past it, because a risk console
    // showing a position the engine should already have closed is a console
    // nobody would believe.
    { key: "pos:3", userId: M, symbol: "BTC/USDT", side: "BUY", entryPrice: 64300, amount: 0.15, leverage: 50, status: "OPEN", createdAt: ago(4), updatedAt: ago(0, 1), stopLossPrice: 63100 },
    { key: "pos:4", userId: A, symbol: "ETH/USDT", side: "SELL", entryPrice: 3180, amount: 6, leverage: 5, status: "OPEN", createdAt: ago(6), updatedAt: ago(0, 1) },
    { key: "pos:5", userId: L, symbol: "ETH/USDT", side: "BUY", entryPrice: 3120, amount: 3.2, leverage: 10, status: "OPEN", createdAt: ago(3), updatedAt: ago(0, 1) },
    { key: "pos:6", userId: M, symbol: "ETH/USDT", side: "BUY", entryPrice: 3255, amount: 4.5, leverage: 10, status: "OPEN", createdAt: ago(2), updatedAt: ago(0, 1), stopLossPrice: 2960 },
    { key: "pos:7", userId: L, symbol: "SOL/USDT", side: "BUY", entryPrice: 138, amount: 120, leverage: 10, status: "OPEN", createdAt: ago(5), updatedAt: ago(0, 1), takeProfitPrice: 165 },
    { key: "pos:8", userId: A, symbol: "SOL/USDT", side: "BUY", entryPrice: 152.4, amount: 60, leverage: 12, status: "OPEN", createdAt: ago(2), updatedAt: ago(0, 1) },
    { key: "pos:9", userId: M, symbol: "SOL/USDT", side: "SELL", entryPrice: 141, amount: 85, leverage: 20, status: "OPEN", createdAt: ago(0, 5), updatedAt: ago(0, 1), stopLossPrice: 149 },
    { key: "pos:10", userId: L, symbol: "SOL/USDT", side: "SELL", entryPrice: 133.5, amount: 45, leverage: 8, status: "OPEN", createdAt: ago(3), updatedAt: ago(0, 1) },
    { key: "pos:11", userId: A, symbol: "MASH/USDT", side: "BUY", entryPrice: 0.79, amount: 12000, leverage: 5, status: "OPEN", createdAt: ago(4), updatedAt: ago(0, 1) },
    { key: "pos:12", userId: L, symbol: "MASH/USDT", side: "SELL", entryPrice: 0.91, amount: 8000, leverage: 10, status: "OPEN", createdAt: ago(1), updatedAt: ago(0, 1) },
    // ---- SETTLED ----------------------------------------------------------
    // `unrealizedPnl` on a terminal row is whatever the last mark left there,
    // which is why the dashboard excludes it from live P&L.
    { key: "pos:13", userId: A, symbol: "BTC/USDT", side: "SELL", entryPrice: 65900, amount: 0.18, leverage: 10, status: "CLOSED", createdAt: ago(9), updatedAt: ago(2), frozenPnl: 742.5 },
    { key: "pos:14", userId: L, symbol: "ETH/USDT", side: "SELL", entryPrice: 3290, amount: 5, leverage: 5, status: "CLOSED", createdAt: ago(11), updatedAt: ago(5), frozenPnl: -310 },
    { key: "pos:15", userId: M, symbol: "SOL/USDT", side: "BUY", entryPrice: 136.2, amount: 200, leverage: 10, status: "CLOSED", createdAt: ago(8), updatedAt: ago(6), frozenPnl: 1220 },
    // A FULL liquidation rewrites `amount` to 0 (`reducePosition`), which is
    // why a liquidated position's size is not recoverable from its own row.
    { key: "pos:16", userId: L, symbol: "BTC/USDT", side: "BUY", entryPrice: 66800, amount: 0, leverage: 50, status: "LIQUIDATED", createdAt: ago(12), updatedAt: ago(3), frozenPnl: -280.56 },
    { key: "pos:17", userId: M, symbol: "ETH/USDT", side: "BUY", entryPrice: 3480, amount: 0, leverage: 25, status: "LIQUIDATED", createdAt: ago(10), updatedAt: ago(4), frozenPnl: -626.4 },
  ];
}

/** The signed unrealised P&L of an open position, from its symbol's mark. */
function pnlOf(p: PositionSpec): number {
  if (p.status !== "OPEN") return p.frozenPnl ?? 0;
  const mark = MARKS[p.symbol];
  const move = p.side === "BUY" ? mark - p.entryPrice : p.entryPrice - mark;
  return money(move * p.amount, 8);
}

/**
 * Order rows.
 *
 * WHY THEY COME IN PAIRS. `matchmaking.ts` is the only place `filled` ever
 * increases, and it does so inside `[buyOrder, sellOrder].forEach` — one trade
 * writes BOTH sides. The dashboard therefore halves its volume sum, and that
 * halving is exact only if every filled quantity appears on exactly two rows.
 * Each entry below becomes two orders, so the "Trading Volume" figure the page
 * prints is the sum of the trade notionals listed here and nothing else.
 *
 * FEES ARE NOT HALVED: both sides pay, so the platform's take really is the
 * sum. The taker/maker rates are read out of each market's own metadata row —
 * including MASH/USDT, which predates this script and charges 1%.
 */
interface TradeSpec {
  key: string;
  symbol: string;
  price: number;
  qty: number;
  at: Date;
  taker: { userId: () => string; side: "BUY" | "SELL"; leverage: number };
  maker: { userId: () => string; side: "BUY" | "SELL"; leverage: number };
  /** The position key the taker leg opened, where the lineage is exact. */
  takerPosition?: string;
}

function buildTrades(): TradeSpec[] {
  const A = () => AVA.id;
  const L = () => LIAM.id;
  const M = () => MORGAN.id;
  return [
    { key: "trd:a", symbol: "BTC/USDT", price: 61000, qty: 0.4, at: ago(6), taker: { userId: A, side: "BUY", leverage: 10 }, maker: { userId: L, side: "SELL", leverage: 20 }, takerPosition: "pos:1" },
    { key: "trd:b", symbol: "BTC/USDT", price: 62000, qty: 0.25, at: ago(5), taker: { userId: L, side: "SELL", leverage: 20 }, maker: { userId: M, side: "BUY", leverage: 10 }, takerPosition: "pos:2" },
    { key: "trd:c", symbol: "BTC/USDT", price: 64300, qty: 0.15, at: ago(4), taker: { userId: M, side: "BUY", leverage: 50 }, maker: { userId: A, side: "SELL", leverage: 10 }, takerPosition: "pos:3" },
    { key: "trd:d", symbol: "ETH/USDT", price: 3180, qty: 6, at: ago(6), taker: { userId: A, side: "SELL", leverage: 5 }, maker: { userId: L, side: "BUY", leverage: 10 }, takerPosition: "pos:4" },
    { key: "trd:e", symbol: "ETH/USDT", price: 3120, qty: 3.2, at: ago(3), taker: { userId: L, side: "BUY", leverage: 10 }, maker: { userId: M, side: "SELL", leverage: 10 }, takerPosition: "pos:5" },
    { key: "trd:f", symbol: "ETH/USDT", price: 3255, qty: 4.5, at: ago(2), taker: { userId: M, side: "BUY", leverage: 10 }, maker: { userId: A, side: "SELL", leverage: 5 }, takerPosition: "pos:6" },
    { key: "trd:g", symbol: "SOL/USDT", price: 138, qty: 120, at: ago(5), taker: { userId: L, side: "BUY", leverage: 10 }, maker: { userId: M, side: "SELL", leverage: 20 }, takerPosition: "pos:7" },
    { key: "trd:h", symbol: "SOL/USDT", price: 152.4, qty: 60, at: ago(2), taker: { userId: A, side: "BUY", leverage: 12 }, maker: { userId: L, side: "SELL", leverage: 8 }, takerPosition: "pos:8" },
    { key: "trd:i", symbol: "SOL/USDT", price: 141, qty: 85, at: ago(0, 5), taker: { userId: M, side: "SELL", leverage: 20 }, maker: { userId: L, side: "BUY", leverage: 10 }, takerPosition: "pos:9" },
    { key: "trd:j", symbol: "MASH/USDT", price: 0.79, qty: 12000, at: ago(4), taker: { userId: A, side: "BUY", leverage: 5 }, maker: { userId: M, side: "SELL", leverage: 10 }, takerPosition: "pos:11" },
  ];
}

/** Orders that never printed: the resting book and two cancellations. */
interface RestingSpec {
  key: string;
  userId: () => string;
  symbol: string;
  type: "LIMIT" | "MARKET";
  side: "BUY" | "SELL";
  price: number;
  amount: number;
  leverage: number;
  status: "OPEN" | "CANCELLED";
  at: Date;
}

function buildResting(): RestingSpec[] {
  const A = () => AVA.id;
  const L = () => LIAM.id;
  const M = () => MORGAN.id;
  return [
    { key: "ord:r1", userId: A, symbol: "BTC/USDT", type: "LIMIT", side: "BUY", price: 58000, amount: 0.3, leverage: 10, status: "OPEN", at: ago(1) },
    { key: "ord:r2", userId: L, symbol: "ETH/USDT", type: "LIMIT", side: "SELL", price: 3600, amount: 4, leverage: 5, status: "OPEN", at: ago(0, 6) },
    { key: "ord:r3", userId: M, symbol: "SOL/USDT", type: "LIMIT", side: "BUY", price: 131.5, amount: 150, leverage: 10, status: "CANCELLED", at: ago(4) },
    { key: "ord:r4", userId: A, symbol: "MASH/USDT", type: "LIMIT", side: "SELL", price: 0.98, amount: 5000, leverage: 5, status: "CANCELLED", at: ago(3) },
  ];
}

// ===========================================================================
// D. THE FOREX DESK  ->  /forex/investment, /admin/forex
// ===========================================================================
/**
 * `/forex/investment` is `forexInvestment` scoped to the signed-in user, so it
 * fills only if AVA herself holds investments. `/admin/forex` aggregates the
 * same table: its "Investment Volume" chart is grouped over the LAST 12 MONTHS,
 * which is why the three investments already on this install (743, 751 and 516
 * days old) leave that card empty while the tiles above it show numbers.
 *
 * `profit` IS SIGNED AND DERIVED. `forex/utils/cron.ts` settles with
 * `roiPercentage` as the canonical field and stores
 * `profit = amount * roiPercentage / 100`, negative on a LOSS and zero on a
 * DRAW. Both columns are written that way here, so the P&L a reader adds up off
 * the rows is the P&L the dashboard prints.
 *
 * TWO NEW PLANS, because the settlement percentage is the PLAN'S. The plans on
 * this install are `basic` (10%), a junk row named `aaa`, and
 * `Beginner_Level_Forex`, whose `profitPercentage` is 0 — every investment
 * against it settles at exactly zero profit, which photographs as a broken
 * product. Rather than edit a row it does not own, this script adds two plans
 * of its own and invests against those.
 */

interface InvestmentSpec {
  key: string;
  who: "ava" | "liam";
  userId: () => string;
  plan: "momentum" | "carry";
  duration: "1 MONTH" | "1 WEEK";
  amount: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  result?: "WIN" | "LOSS" | "DRAW";
  /** Signed. profit = amount * roiPercentage / 100. */
  roiPercentage?: number;
  createdAt: Date;
}

const FOREX_OPENING_CAPITAL: Record<"ava" | "liam", number> = {
  ava: 25000,
  liam: 12000,
};

function buildInvestments(): InvestmentSpec[] {
  const A = () => AVA.id;
  const L = () => LIAM.id;
  return [
    // --- Ava: 14 rows, because her own list is 12 to a page ----------------
    { key: "inv:a1", who: "ava", userId: A, plan: "momentum", duration: "1 MONTH", amount: 750, status: "COMPLETED", result: "WIN", roiPercentage: 8.5, createdAt: monthsAgo(9) },
    { key: "inv:a2", who: "ava", userId: A, plan: "momentum", duration: "1 MONTH", amount: 1200, status: "COMPLETED", result: "WIN", roiPercentage: 8.5, createdAt: monthsAgo(8) },
    { key: "inv:a3", who: "ava", userId: A, plan: "carry", duration: "1 MONTH", amount: 3000, status: "COMPLETED", result: "WIN", roiPercentage: 4.25, createdAt: monthsAgo(8, 6) },
    { key: "inv:a4", who: "ava", userId: A, plan: "momentum", duration: "1 WEEK", amount: 900, status: "COMPLETED", result: "LOSS", roiPercentage: -6, createdAt: monthsAgo(7) },
    { key: "inv:a5", who: "ava", userId: A, plan: "carry", duration: "1 MONTH", amount: 5000, status: "COMPLETED", result: "WIN", roiPercentage: 4.25, createdAt: monthsAgo(6) },
    { key: "inv:a6", who: "ava", userId: A, plan: "momentum", duration: "1 MONTH", amount: 2400, status: "COMPLETED", result: "DRAW", roiPercentage: 0, createdAt: monthsAgo(6, 9) },
    { key: "inv:a7", who: "ava", userId: A, plan: "momentum", duration: "1 WEEK", amount: 1500, status: "COMPLETED", result: "WIN", roiPercentage: 8.5, createdAt: monthsAgo(5) },
    { key: "inv:a8", who: "ava", userId: A, plan: "carry", duration: "1 MONTH", amount: 8000, status: "COMPLETED", result: "WIN", roiPercentage: 4.25, createdAt: monthsAgo(4) },
    { key: "inv:a9", who: "ava", userId: A, plan: "momentum", duration: "1 WEEK", amount: 600, status: "COMPLETED", result: "LOSS", roiPercentage: -9, createdAt: monthsAgo(3) },
    { key: "inv:a10", who: "ava", userId: A, plan: "momentum", duration: "1 MONTH", amount: 3200, status: "COMPLETED", result: "WIN", roiPercentage: 8.5, createdAt: monthsAgo(3, 11) },
    { key: "inv:a11", who: "ava", userId: A, plan: "carry", duration: "1 MONTH", amount: 4500, status: "REJECTED", createdAt: monthsAgo(2) },
    { key: "inv:a12", who: "ava", userId: A, plan: "momentum", duration: "1 WEEK", amount: 1800, status: "CANCELLED", createdAt: ago(44) },
    { key: "inv:a13", who: "ava", userId: A, plan: "momentum", duration: "1 MONTH", amount: 2500, status: "ACTIVE", createdAt: ago(10) },
    { key: "inv:a14", who: "ava", userId: A, plan: "carry", duration: "1 MONTH", amount: 6000, status: "ACTIVE", createdAt: ago(3) },
    // --- Liam: a second name on the admin dashboard's recent list ----------
    { key: "inv:l1", who: "liam", userId: L, plan: "momentum", duration: "1 MONTH", amount: 1000, status: "COMPLETED", result: "WIN", roiPercentage: 8.5, createdAt: monthsAgo(7, 4) },
    { key: "inv:l2", who: "liam", userId: L, plan: "carry", duration: "1 MONTH", amount: 2500, status: "COMPLETED", result: "LOSS", roiPercentage: -3, createdAt: monthsAgo(5, 8) },
    { key: "inv:l3", who: "liam", userId: L, plan: "momentum", duration: "1 MONTH", amount: 2000, status: "COMPLETED", result: "WIN", roiPercentage: 8.5, createdAt: monthsAgo(4, 6) },
    { key: "inv:l4", who: "liam", userId: L, plan: "carry", duration: "1 MONTH", amount: 3500, status: "COMPLETED", result: "DRAW", roiPercentage: 0, createdAt: monthsAgo(2, 3) },
    { key: "inv:l5", who: "liam", userId: L, plan: "momentum", duration: "1 MONTH", amount: 1400, status: "ACTIVE", createdAt: ago(18) },
    { key: "inv:l6", who: "liam", userId: L, plan: "momentum", duration: "1 MONTH", amount: 850, status: "ACTIVE", createdAt: ago(5) },
  ];
}

const investmentProfit = (i: InvestmentSpec): number | null =>
  i.status === "COMPLETED"
    ? money((i.amount * (i.roiPercentage ?? 0)) / 100, 8)
    : null;

const DURATION_MS: Record<InvestmentSpec["duration"], number> = {
  "1 MONTH": 30 * DAY,
  "1 WEEK": 7 * DAY,
};

const PLAN_KEYS = {
  momentum: "fxplan:momentum",
  carry: "fxplan:carry",
} as const;

const FOREX_PLANS = [
  {
    key: PLAN_KEYS.momentum,
    name: "Momentum Growth",
    title: "Momentum Growth",
    description:
      "A short-cycle plan that follows trending majors. For investors who want their capital working on a weekly or monthly rotation.",
    minAmount: 500,
    maxAmount: 10000,
    profitPercentage: 8.5,
    minProfit: 4,
    maxProfit: 12,
    defaultProfit: 8.5,
    trending: true,
  },
  {
    key: PLAN_KEYS.carry,
    name: "Carry Income",
    title: "Carry Income",
    description:
      "A lower-volatility plan built around interest-rate differentials and settled monthly. Larger minimum, steadier return.",
    minAmount: 2000,
    maxAmount: 25000,
    profitPercentage: 4.25,
    minProfit: 2,
    maxProfit: 6,
    defaultProfit: 4.25,
    trending: false,
  },
];

const FOREX_ACCOUNTS = [
  { key: "fxacct:ava", who: "ava" as const, accountId: "FXD-204817", leverage: 100, mt: 5 },
  { key: "fxacct:liam", who: "liam" as const, accountId: "FXD-204902", leverage: 200, mt: 5 },
];

// ===========================================================================
// PURGE
// ===========================================================================

/** Every wallet id this script owns, transfer and UTXO alike. */
function ownedWalletIds(): string[] {
  return [
    ...buildTransferWallets().map((w) => fid(w.key)),
    ...buildUtxoWallets().map((w) => fid(w.key)),
  ];
}

/** Every Scylla row id this script owns, per table. */
function ownedScyllaIds(): { orders: string[]; positions: string[] } {
  const orders: string[] = [];
  for (const t of buildTrades()) {
    orders.push(fid(`${t.key}:taker`), fid(`${t.key}:maker`));
  }
  for (const r of buildResting()) orders.push(fid(r.key));
  return { orders, positions: buildPositions().map((p) => fid(p.key)) };
}

async function purgeScylla() {
  if (!scylla || !scyllaFuturesKeyspace) return;
  const ks = scyllaFuturesKeyspace;
  const owned = ownedScyllaIds();
  const orderIds = new Set(owned.orders);
  const positionIds = new Set(owned.positions);

  // The order table's primary key is (("userId"), "createdAt", id) and the
  // position table's is (("userId"), id) — neither can be deleted by id alone,
  // and `createdAt` moves with every run because the dates are relative. So the
  // purge READS the key columns back and deletes only rows whose id is in this
  // script's own set. It can never name a row it did not write.
  try {
    const rows = await scylla.execute(
      `SELECT id, "userId", "createdAt" FROM ${ks}.orders`,
      [],
      { prepare: true, fetchSize: 5000 }
    );
    for (const r of rows.rows) {
      if (!orderIds.has(String(r.id))) continue;
      await scylla.execute(
        `DELETE FROM ${ks}.orders WHERE "userId" = ? AND "createdAt" = ? AND id = ?`,
        [r.userId, r.createdAt, r.id],
        { prepare: true }
      );
    }
  } catch (e: any) {
    log(`  ! could not purge ${ks}.orders: ${e?.message}`);
  }

  try {
    const rows = await scylla.execute(
      `SELECT id, "userId" FROM ${ks}.position`,
      [],
      { prepare: true, fetchSize: 5000 }
    );
    for (const r of rows.rows) {
      if (!positionIds.has(String(r.id))) continue;
      await scylla.execute(
        `DELETE FROM ${ks}.position WHERE "userId" = ? AND id = ?`,
        [r.userId, r.id],
        { prepare: true }
      );
    }
  } catch (e: any) {
    log(`  ! could not purge ${ks}.position: ${e?.message}`);
  }
}

async function purge() {
  const hard = { force: true } as const;
  const walletIds = ownedWalletIds();

  // Children before parents: a UTXO and a transaction both FK the wallet.
  await models.ecosystemUtxo.destroy({ where: { walletId: walletIds }, ...hard });
  await models.transaction.destroy({ where: { walletId: walletIds }, ...hard });
  await models.wallet.destroy({ where: { id: walletIds }, ...hard });

  await models.forexInvestment.destroy({
    where: { id: buildInvestments().map((i) => fid(i.key)) },
    ...hard,
  });
  await models.forexAccount.destroy({
    where: { id: FOREX_ACCOUNTS.map((a) => fid(a.key)) },
    ...hard,
  });
  // forex_plan_duration is a pure join table with no timestamps and no
  // paranoid column, so `force` is neither available nor needed.
  await models.forexPlanDuration.destroy({
    where: { planId: FOREX_PLANS.map((p) => fid(p.key)) },
  });
  await models.forexPlan.destroy({
    where: { id: FOREX_PLANS.map((p) => fid(p.key)) },
    ...hard,
  });

  await models.futuresMarket.destroy({
    where: { id: NEW_MARKETS.map((m) => fid(m.key)) },
    ...hard,
  });

  await purgeScylla();
}

// ===========================================================================
// SEED
// ===========================================================================

async function seedTransfers() {
  log("\n== transfer queue ==");
  const specs = buildTransferWallets();
  const byKey = new Map(specs.map((s) => [s.key, s]));

  for (const w of specs) {
    const balance = money(w.ledger.reduce((s, e) => s + e.delta, 0));
    if (balance < 0) {
      throw new Error(`wallet ${w.key} would land negative: ${balance}`);
    }
    await models.wallet.create({
      id: fid(w.key),
      userId: w.userId(),
      type: w.type,
      currency: w.currency,
      balance,
      inOrder: 0,
      // Deliberately no address — see the note on btcDepositScanner above.
      address: null,
      status: true,
      createdAt: w.createdAt,
      updatedAt: new Date(),
    } as any);
  }

  let rows = 0;
  for (const w of specs) {
    for (const e of w.ledger) {
      const other = e.counterparty ? byKey.get(e.counterparty)! : null;
      const f = e.kind === "TRANSFER_OUT" ? feeOn(e.amount) : 0;
      const metadata =
        e.kind === "TRANSFER_OUT"
          ? {
              // Read by the "to" column AND by the settlement endpoint. A row
              // without these renders "Missing destination" and 400s on approve.
              targetWalletId: fid(e.counterparty!),
              targetAmount: money(e.amount - f),
              toCurrency: other!.currency,
              transferStatus: e.status,
              fromWallet: fid(w.key),
              fromCurrency: w.currency,
              platformFee: f,
              platformFeeCurrency: w.currency,
              transferType: "wallet",
            }
          : e.kind === "TRANSFER_IN"
            ? {
                sourceWalletId: fid(e.counterparty!),
                sourceAmount: e.amount,
              }
            : {
                network: w.currency === "USDT" ? "BEP20" : w.currency,
                confirmations: 32,
              };

      await models.transaction.create({
        id: fid(`tx:${w.key}:${e.key}`),
        userId: w.userId(),
        walletId: fid(w.key),
        type:
          e.kind === "DEPOSIT"
            ? "DEPOSIT"
            : e.kind === "TRANSFER_OUT"
              ? "OUTGOING_TRANSFER"
              : "INCOMING_TRANSFER",
        status: e.status,
        amount: e.amount,
        fee: f,
        description: e.description,
        referenceId: ref(`${w.key}:${e.key}`),
        idempotencyKey: idem(`${w.key}:${e.key}`),
        metadata: JSON.stringify(metadata),
        createdAt: e.at,
        updatedAt: e.at,
      } as any);
      rows++;
    }
  }
  log(`  ${specs.length} wallets, ${rows} transactions`);
}

async function seedUtxos() {
  log("\n== ecosystem UTXOs ==");
  const specs = buildUtxoWallets();
  let utxoRows = 0;
  let txRows = 0;

  for (const w of specs) {
    const walletId = fid(w.key);
    const credited = w.deposits.reduce((s, d) => s + d.amount, 0);
    const debited = w.withdrawals.reduce(
      (s, x) => s + x.amount + x.minerFee,
      0
    );
    const balance = money(credited - debited);
    if (balance < 0) throw new Error(`utxo wallet ${w.key} negative: ${balance}`);

    await models.wallet.create({
      id: walletId,
      userId: w.userId(),
      type: "ECO",
      currency: w.currency,
      balance,
      inOrder: 0,
      address: null,
      status: true,
      createdAt: w.createdAt,
      updatedAt: new Date(),
    } as any);

    // The withdrawal that holds the LOCKED outputs, if any.
    const inFlight = w.withdrawals.find((x) => x.status !== "COMPLETED");

    for (const u of w.utxos) {
      await models.ecosystemUtxo.create({
        id: fid(`utxo:${w.key}:${u.key}`),
        walletId,
        transactionId: txHash(`${w.key}:${u.key}`),
        index: u.index,
        amount: u.amount,
        script: lockScript(`${w.key}:${u.key}`),
        status: u.status,
        origin: u.origin,
        lockedTxId:
          u.status === "LOCKED" && inFlight
            ? txHash(`${w.key}:${inFlight.key}`)
            : null,
        createdAt: u.at,
        updatedAt: u.at,
      } as any);
      utxoRows++;
    }

    for (const d of w.deposits) {
      const utxo = w.utxos.find((u) => u.key === d.utxoKey)!;
      await models.transaction.create({
        id: fid(`tx:${w.key}:${d.key}`),
        userId: w.userId(),
        walletId,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: d.amount,
        fee: 0,
        description: `Deposit of ${d.amount} ${w.currency}`,
        referenceId: ref(`${w.key}:${d.key}`),
        idempotencyKey: idem(`${w.key}:${d.key}`),
        trxId: txHash(`${w.key}:${d.utxoKey}`),
        metadata: JSON.stringify({
          network: w.currency,
          confirmations: 6,
          outpoint: `${txHash(`${w.key}:${d.utxoKey}`)}:${utxo.index}`,
        }),
        createdAt: d.at,
        updatedAt: d.at,
      } as any);
      txRows++;
    }

    for (const x of w.withdrawals) {
      await models.transaction.create({
        id: fid(`tx:${w.key}:${x.key}`),
        userId: w.userId(),
        walletId,
        type: "WITHDRAW",
        status: x.status,
        amount: x.amount,
        fee: x.minerFee,
        description: `Withdrawal of ${x.amount} ${w.currency}`,
        referenceId: ref(`${w.key}:${x.key}`),
        idempotencyKey: idem(`${w.key}:${x.key}`),
        trxId: x.status === "COMPLETED" ? txHash(`${w.key}:${x.key}`) : null,
        metadata: JSON.stringify({
          network: w.currency,
          // The withdrawal's fee IS the miner fee the change output is short
          // by. That equality is what keeps the ledger and the chain in step
          // once a withdrawal settles.
          minerFee: x.minerFee,
        }),
        createdAt: x.at,
        updatedAt: x.at,
      } as any);
      txRows++;
    }
  }
  log(`  ${specs.length} ECO wallets, ${utxoRows} UTXOs, ${txRows} transactions`);
}

async function seedForex() {
  log("\n== forex ==");

  // Durations are shared platform rows: reuse, never own.
  const durations: any[] = await models.forexDuration.findAll({ raw: true });
  const durationIdFor = (label: InvestmentSpec["duration"]) => {
    const [n, tf] = label.split(" ");
    const row = durations.find(
      (d) => Number(d.duration) === Number(n) && String(d.timeframe) === tf
    );
    if (!row) throw new Error(`forex_duration "${label}" not found`);
    return row.id as string;
  };

  for (const p of FOREX_PLANS) {
    await models.forexPlan.create({
      id: fid(p.key),
      name: p.name,
      title: p.title,
      description: p.description,
      minProfit: p.minProfit,
      maxProfit: p.maxProfit,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      profitPercentage: p.profitPercentage,
      defaultProfit: p.defaultProfit,
      defaultResult: "WIN",
      trending: p.trending,
      status: true,
      currency: "USDT",
      walletType: "SPOT",
      createdAt: ago(300),
      updatedAt: new Date(),
    } as any);

    for (const label of ["1 MONTH", "1 WEEK"] as const) {
      await models.forexPlanDuration.create({
        id: fid(`${p.key}:dur:${label}`),
        planId: fid(p.key),
        durationId: durationIdFor(label),
      } as any);
    }
  }

  const investments = buildInvestments();
  const personaOf = (who: "ava" | "liam") => (who === "ava" ? AVA : LIAM);

  for (const a of FOREX_ACCOUNTS) {
    const mine = investments.filter((i) => i.who === a.who);
    const activePrincipal = mine
      .filter((i) => i.status === "ACTIVE")
      .reduce((s, i) => s + i.amount, 0);
    const settledProfit = mine.reduce(
      (s, i) => s + (investmentProfit(i) ?? 0),
      0
    );
    const balance = money(
      FOREX_OPENING_CAPITAL[a.who] - activePrincipal + settledProfit,
      2
    );
    if (balance < 0) throw new Error(`forex account ${a.key} negative: ${balance}`);

    await models.forexAccount.create({
      id: fid(a.key),
      userId: personaOf(a.who).id,
      accountId: a.accountId,
      password: null,
      broker: "DocsDemo Markets",
      mt: a.mt,
      balance,
      leverage: a.leverage,
      type: "LIVE",
      status: true,
      // The bound denomination. `assertAccountDenomination` refuses any
      // movement that disagrees with these two, and both plans settle in
      // SPOT USDT.
      currency: "USDT",
      walletType: "SPOT",
      dailyWithdrawLimit: 5000,
      monthlyWithdrawLimit: 50000,
      dailyWithdrawn: 0,
      monthlyWithdrawn: 0,
      createdAt: ago(320),
      updatedAt: new Date(),
    } as any);
  }

  for (const i of investments) {
    const endDate = new Date(i.createdAt.getTime() + DURATION_MS[i.duration]);
    await models.forexInvestment.create({
      id: fid(i.key),
      userId: i.userId(),
      planId: fid(PLAN_KEYS[i.plan]),
      durationId: durationIdFor(i.duration),
      amount: i.amount,
      profit: investmentProfit(i),
      roiPercentage: i.status === "COMPLETED" ? (i.roiPercentage ?? 0) : null,
      result: i.status === "COMPLETED" ? i.result : null,
      status: i.status,
      endDate,
      termsAcceptedAt: i.createdAt,
      termsVersion: "1.0",
      createdAt: i.createdAt,
      updatedAt: i.status === "ACTIVE" ? i.createdAt : endDate,
    } as any);
  }

  log(
    `  ${FOREX_PLANS.length} plans, ${FOREX_ACCOUNTS.length} live accounts, ${investments.length} investments`
  );
}

async function seedFuturesMarkets() {
  for (const m of NEW_MARKETS) {
    await models.futuresMarket.create({
      id: fid(m.key),
      currency: m.currency,
      pair: m.pair,
      isTrending: m.isTrending,
      isHot: m.isHot,
      // The model's own setter stringifies this column. Passing a string here
      // stores the TEXT of a string and the `isJSON` validator rejects it.
      metadata: m.metadata,
      status: true,
      createdAt: ago(200),
      updatedAt: new Date(),
    } as any);
  }
}

/** taker/maker rates, in per cent, read from each market's own metadata row. */
async function marketRates(): Promise<
  Record<string, { taker: number; maker: number }>
> {
  const rows: any[] = await models.futuresMarket.findAll({ raw: true });
  const out: Record<string, { taker: number; maker: number }> = {};
  for (const r of rows) {
    let meta: any = {};
    try {
      meta =
        typeof r.metadata === "string"
          ? JSON.parse(r.metadata)
          : r.metadata || {};
    } catch {
      meta = {};
    }
    out[`${r.currency}/${r.pair}`] = {
      taker: Number(meta.taker ?? 0.05),
      maker: Number(meta.maker ?? 0.02),
    };
  }
  return out;
}

async function seedFutures() {
  log("\n== futures (ScyllaDB) ==");
  if (!scylla || !scyllaFuturesKeyspace || !toBigInt) {
    log(`  ! SKIPPED — futures store unreachable: ${scyllaLoadError}`);
    return;
  }
  const ks = scyllaFuturesKeyspace;
  const v = (n: number) => toBigInt!(n).toString();

  const positions = buildPositions();
  for (const p of positions) {
    await scylla.execute(
      `INSERT INTO ${ks}.position (id, "userId", symbol, side, "entryPrice", amount,
         leverage, "unrealizedPnl", "stopLossPrice", "takeProfitPrice", status,
         "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fid(p.key),
        p.userId(),
        p.symbol,
        p.side,
        v(p.entryPrice),
        v(p.amount),
        // PLAIN INTEGER, bound as a string. See the header note.
        String(Math.max(1, Math.floor(p.leverage))),
        v(pnlOf(p)),
        p.stopLossPrice != null ? v(p.stopLossPrice) : null,
        p.takeProfitPrice != null ? v(p.takeProfitPrice) : null,
        p.status,
        p.createdAt,
        p.updatedAt,
      ],
      { prepare: true }
    );
  }

  const rates = await marketRates();
  const positionIdByKey = new Map(positions.map((p) => [p.key, fid(p.key)]));
  let orderRows = 0;

  const writeOrder = (o: {
    id: string;
    userId: string;
    symbol: string;
    type: "LIMIT" | "MARKET";
    side: "BUY" | "SELL";
    price: number;
    average: number;
    amount: number;
    filled: number;
    leverage: number;
    feeAmount: number;
    status: string;
    isTaker: boolean;
    positionId: string | null;
    at: Date;
  }) =>
    scylla.execute(
      `INSERT INTO ${ks}.orders (id, "userId", symbol, type, "timeInForce", side, price,
         average, amount, filled, remaining, cost, leverage, fee, "feeCurrency",
         status, "reduceOnly", "positionId", "isTaker", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.id,
        o.userId,
        o.symbol,
        o.type,
        "GTC",
        o.side,
        v(o.price),
        v(o.average),
        v(o.amount),
        v(o.filled),
        v(money(o.amount - o.filled)),
        // `cost` is the MARGIN the order reserves (amount x price / leverage),
        // which is what `order/index.post.ts` stores. It is not the notional,
        // and the dashboard is careful never to call it volume.
        v(money((o.amount * o.price) / o.leverage)),
        String(Math.max(1, Math.floor(o.leverage))),
        v(o.feeAmount),
        "USDT",
        o.status,
        false,
        o.positionId,
        o.isTaker,
        o.at,
        o.at,
      ],
      { prepare: true }
    );

  for (const t of buildTrades()) {
    const r = rates[t.symbol] ?? { taker: 0.05, maker: 0.02 };
    const notional = t.price * t.qty;
    await writeOrder({
      id: fid(`${t.key}:taker`),
      userId: t.taker.userId(),
      symbol: t.symbol,
      type: "MARKET",
      side: t.taker.side,
      price: t.price,
      average: t.price,
      amount: t.qty,
      filled: t.qty,
      leverage: t.taker.leverage,
      feeAmount: money((notional * r.taker) / 100),
      status: "CLOSED",
      isTaker: true,
      positionId: t.takerPosition
        ? positionIdByKey.get(t.takerPosition)!
        : null,
      at: t.at,
    });
    await writeOrder({
      id: fid(`${t.key}:maker`),
      userId: t.maker.userId(),
      symbol: t.symbol,
      type: "LIMIT",
      side: t.maker.side,
      price: t.price,
      average: t.price,
      amount: t.qty,
      filled: t.qty,
      leverage: t.maker.leverage,
      feeAmount: money((notional * r.maker) / 100),
      status: "CLOSED",
      isTaker: false,
      positionId: null,
      // The maker was resting before the taker arrived.
      at: new Date(t.at.getTime() - 90_000),
    });
    orderRows += 2;
  }

  for (const o of buildResting()) {
    const r = rates[o.symbol] ?? { taker: 0.05, maker: 0.02 };
    await writeOrder({
      id: fid(o.key),
      userId: o.userId(),
      symbol: o.symbol,
      type: o.type,
      side: o.side,
      price: o.price,
      // An order that has printed nothing has no average.
      average: 0,
      amount: o.amount,
      filled: 0,
      leverage: o.leverage,
      // The fee is charged on the WHOLE order at placement and the unfilled
      // share is refunded on expiry, which is why the dashboard only ever
      // counts `fee x filled / amount` — zero for these.
      feeAmount: money((o.amount * o.price * r.maker) / 100),
      status: o.status,
      isTaker: false,
      positionId: null,
      at: o.at,
    });
    orderRows++;
  }

  log(`  ${positions.length} positions, ${orderRows} orders in keyspace "${ks}"`);
}

async function seed() {
  await seedTransfers();
  await seedUtxos();
  await seedFuturesMarkets();
  await seedFutures();
  await seedForex();
}

// ===========================================================================
// VERIFY — re-read what is STORED and re-derive every total.
// ===========================================================================

async function verifyTransfers() {
  log("\n== verify: transfer wallets ==");
  const specs = buildTransferWallets();
  const rows: any[] = [];
  for (const w of specs) {
    const id = fid(w.key);
    const stored: any = await models.wallet.findByPk(id);
    if (!stored) {
      check(false, `wallet ${w.key}`, "missing");
      continue;
    }
    // DECIMAL(36,18) comes back as a STRING; parseFloat, or every comparison
    // below silently becomes string concatenation.
    const balance = parseFloat(String(stored.balance));
    const txns: any[] = await models.transaction.findAll({
      where: { walletId: id },
      raw: true,
    });
    const expected = money(w.ledger.reduce((s, e) => s + e.delta, 0));
    const ok =
      Math.abs(balance - expected) < 1e-8 && txns.length === w.ledger.length;
    rows.push({
      wallet: `${w.type}/${w.currency}`,
      who: w.who,
      stored: balance,
      derived: expected,
      txns: `${txns.length}/${w.ledger.length}`,
      reconciles: ok ? "yes" : "NO",
    });
    check(ok, `wallet ${w.key}`, `${balance} vs ${expected}`);
  }
  // eslint-disable-next-line no-console
  console.table(rows);

  const pending = await models.transaction.count({
    where: {
      type: "OUTGOING_TRANSFER",
      status: "PENDING",
      walletId: specs.map((w) => fid(w.key)),
    },
  });
  check(
    pending >= 8,
    "the PENDING queue fills a page (the list opens filtered to PENDING)",
    `${pending} rows`
  );
}

async function verifyUtxos() {
  log("\n== verify: UTXO wallets ==");
  const rows: any[] = [];
  for (const w of buildUtxoWallets()) {
    const id = fid(w.key);
    const stored: any = await models.wallet.findByPk(id);
    if (!stored) {
      check(false, `utxo wallet ${w.key}`, "missing");
      continue;
    }
    const balance = parseFloat(String(stored.balance));
    const utxos: any[] = await models.ecosystemUtxo.findAll({
      where: { walletId: id },
      raw: true,
    });
    const spendable = money(
      utxos
        .filter((u) => u.status === "UNSPENT" || u.status === "LOCKED")
        .reduce((s, u) => s + Number(u.amount), 0)
    );
    const inFlight = money(
      w.withdrawals
        .filter((x) => x.status !== "COMPLETED")
        .reduce((s, x) => s + x.amount + x.minerFee, 0)
    );
    const ok = Math.abs(spendable - balance - inFlight) < 1e-8;
    rows.push({
      wallet: `ECO/${w.currency}`,
      who: w.who,
      ledger: balance,
      onChain: spendable,
      inFlight,
      utxos: utxos.length,
      reconciles: ok ? "yes" : "NO",
    });
    check(
      ok,
      `utxo wallet ${w.key}`,
      `onChain ${spendable} - ledger ${balance} = ${money(spendable - balance)}, in flight ${inFlight}`
    );
  }
  // eslint-disable-next-line no-console
  console.table(rows);
}

async function verifyFutures() {
  log("\n== verify: futures book ==");
  if (!scylla || !scyllaFuturesKeyspace || !fromBigInt) {
    log("  ! SKIPPED — futures store unreachable");
    return;
  }
  const ks = scyllaFuturesKeyspace;
  const owned = ownedScyllaIds();
  const ownedPositions = new Set(owned.positions);
  const ownedOrders = new Set(owned.orders);
  const specs = buildPositions();
  const specByFid = new Map(specs.map((p) => [fid(p.key), p]));

  const posRows = (
    await scylla.execute(
      `SELECT id, symbol, side, "entryPrice", amount, leverage, "unrealizedPnl", status
         FROM ${ks}.position`,
      [],
      { prepare: true, fetchSize: 5000 }
    )
  ).rows.filter((r: any) => ownedPositions.has(String(r.id)));

  check(
    posRows.length === specs.length,
    "positions stored",
    `${posRows.length}/${specs.length}`
  );

  // Every OPEN position must value at exactly ONE mark per symbol.
  let markOk = true;
  let solventOk = true;
  let openNotional = 0;
  let openPnl = 0;
  let atRisk = 0;
  let worstRom = 0;
  for (const r of posRows) {
    if (String(r.status) !== "OPEN") continue;
    const spec = specByFid.get(String(r.id))!;
    const entry = fromBigInt(BigInt(r.entryPrice.toString()));
    const amount = fromBigInt(BigInt(r.amount.toString()));
    const pnl = fromBigInt(BigInt(r.unrealizedPnl.toString()));
    const lev = Number(r.leverage);
    const implied =
      amount > 0
        ? spec.side === "BUY"
          ? entry + pnl / amount
          : entry - pnl / amount
        : entry;
    if (Math.abs(implied - MARKS[spec.symbol]) > 1e-6) {
      markOk = false;
      log(
        `  FAIL ${spec.key} implies a mark of ${implied}, expected ${MARKS[spec.symbol]}`
      );
    }
    const notional = entry * amount;
    const margin = notional / lev;
    openNotional += notional;
    openPnl += pnl;

    // Return on margin, exactly as the liquidation path computes it.
    const rom = margin > 0 ? pnl / margin : 0;
    if (rom < 0) {
      worstRom = Math.max(worstRom, Math.abs(rom));
      // The engine closes a position outright at FULL_LIQ. A seeded row past it
      // is a row the engine should already have taken off the book.
      if (Math.abs(rom) >= FULL_LIQ) {
        solventOk = false;
        log(
          `  FAIL ${spec.key} sits at ${(Math.abs(rom) * 100).toFixed(1)}% return on margin, ` +
            `past the engine's ${(FULL_LIQ * 100).toFixed(0)}% liquidation threshold`
        );
      }
      // The dashboard's at-risk line is the engine's PARTIAL threshold on the
      // same scale: everything past it is trimmed on the next mark.
      if (Math.abs(rom) >= PARTIAL_LIQ) atRisk++;
    }
  }
  check(markOk, "every open position values at its symbol's single mark price");
  check(
    solventOk,
    "no open position is past the engine's liquidation threshold",
    `worst ${(worstRom * 100).toFixed(1)}% of ${(FULL_LIQ * 100).toFixed(0)}%`
  );
  check(atRisk >= 1, "the book has at least one at-risk position", `${atRisk}`);
  log(
    `  open notional ${money(openNotional, 2)} USDT; trader unrealised P&L ${money(openPnl, 2)} USDT`
  );

  const orderRows = (
    await scylla.execute(
      `SELECT id, symbol, amount, filled, average, price, fee, status FROM ${ks}.orders`,
      [],
      { prepare: true, fetchSize: 5000 }
    )
  ).rows.filter((r: any) => ownedOrders.has(String(r.id)));

  check(
    orderRows.length === owned.orders.length,
    "orders stored",
    `${orderRows.length}/${owned.orders.length}`
  );

  // The dashboard's volume: SUM(filled x average), halved because one trade
  // writes both sides. That halving is exact only if the book is really paired.
  let doubled = 0;
  let fees = 0;
  for (const r of orderRows) {
    const filled = fromBigInt(BigInt(r.filled.toString()));
    if (!(filled > 0)) continue;
    const average = fromBigInt(BigInt(r.average.toString()));
    const price = fromBigInt(BigInt(r.price.toString()));
    doubled += filled * (average > 0 ? average : price);
    const ordered = fromBigInt(BigInt(r.amount.toString()));
    if (ordered > 0) {
      fees += fromBigInt(BigInt(r.fee.toString())) * (filled / ordered);
    }
  }
  const volume = doubled / 2;
  const expectedVolume = money(
    buildTrades().reduce((s, t) => s + t.price * t.qty, 0),
    6
  );
  check(
    Math.abs(volume - expectedVolume) < 1e-4,
    "traded volume halves exactly to the sum of the trades",
    `${money(volume, 2)} vs ${money(expectedVolume, 2)}`
  );
  log(`  period fees ${money(fees, 4)} USDT`);
}

async function verifyForex() {
  log("\n== verify: forex ==");
  const investments = buildInvestments();
  const rows: any[] = [];

  for (const a of FOREX_ACCOUNTS) {
    const stored: any = await models.forexAccount.findByPk(fid(a.key));
    if (!stored) {
      check(false, `forex account ${a.key}`, "missing");
      continue;
    }
    const mine = investments.filter((i) => i.who === a.who);
    const activePrincipal = mine
      .filter((i) => i.status === "ACTIVE")
      .reduce((s, i) => s + i.amount, 0);

    // Re-derive the settled P&L from what is STORED, not from the spec.
    const settled: any[] = await models.forexInvestment.findAll({
      where: { id: mine.map((i) => fid(i.key)), status: "COMPLETED" },
      raw: true,
    });
    let profitSum = 0;
    let signOk = true;
    for (const r of settled) {
      const amount = Number(r.amount);
      const roi = Number(r.roiPercentage ?? 0);
      const profit = Number(r.profit ?? 0);
      if (Math.abs(profit - (amount * roi) / 100) > 1e-6) {
        signOk = false;
        log(`  FAIL investment ${r.id}: profit ${profit} != ${amount} x ${roi}%`);
      }
      if (r.result === "LOSS" && profit > 0) signOk = false;
      if (r.result === "WIN" && profit < 0) signOk = false;
      if (r.result === "DRAW" && profit !== 0) signOk = false;
      profitSum += profit;
    }
    const derived = money(
      FOREX_OPENING_CAPITAL[a.who] - activePrincipal + profitSum,
      2
    );
    const balance = Number(stored.balance);
    const ok = Math.abs(balance - derived) < 1e-6 && signOk;
    rows.push({
      account: a.accountId,
      who: a.who,
      opening: FOREX_OPENING_CAPITAL[a.who],
      activeOut: activePrincipal,
      settledPnl: money(profitSum, 2),
      stored: balance,
      derived,
      reconciles: ok ? "yes" : "NO",
    });
    check(ok, `forex account ${a.accountId}`, `${balance} vs ${derived}`);
  }
  // eslint-disable-next-line no-console
  console.table(rows);

  const avaCount = await models.forexInvestment.count({
    where: { userId: AVA.id },
  });
  check(avaCount >= 12, "Ava's investment list fills its first page", `${avaCount}`);

  const inWindow = await models.forexInvestment.count({
    where: {
      id: investments.map((i) => fid(i.key)),
      createdAt: { [Op.gte]: ago(365) },
    },
  });
  check(
    inWindow === investments.length,
    "every investment lands inside the dashboard's 12-month chart window",
    `${inWindow}/${investments.length}`
  );
}

async function verify() {
  await verifyTransfers();
  await verifyUtxos();
  await verifyFutures();
  await verifyForex();
  log(FAILURES === 0 ? "\nVERIFY: PASS" : `\nVERIFY: FAIL (${FAILURES})`);
  if (FAILURES > 0) process.exitCode = 1;
}

// ===========================================================================

async function main() {
  await sequelize.authenticate();
  await loadPersonas();
  await assertSafe();

  if (MODE_VERIFY) {
    await verify();
    return;
  }

  if (MODE_UNDO) {
    log("Removing every row seed-docs-finance owns...");
    await purge();
    log("Done. The finance surfaces are back to how they photographed.");
    return;
  }

  log(
    "Seeding the finance documentation surfaces (re-runnable: purging any previous run first)..."
  );
  await purge();
  await seed();
  await verify();

  log("\n---------------------------------------------------------------");
  log("  /admin/finance/transfer        PENDING approval queue");
  log("  /admin/ecosystem/utxo          BTC + DOGE outputs, mixed states");
  log("  /admin/finance/order/futures   futures order blotter (ScyllaDB)");
  log("  /admin/futures/position        futures positions (ScyllaDB)");
  log("  /admin/futures                 risk dashboard, derived from both");
  log("  /forex/investment              Ava's investments");
  log("  /admin/forex                   forex dashboard + 12-month chart");
  log("---------------------------------------------------------------");
  log("  NOT fixable by seeding — see the header:");
  log("    /admin/finance/exchange/balance  live ccxt call; keys rejected (-2015)");
  log("    /forex/plan                      captured signed OUT; route is auth-only");
  log("---------------------------------------------------------------");
  log(
    "  undo:  npx tsx -r dotenv/config scripts/seed-docs-finance.ts dotenv_config_path=../.env --undo"
  );
}

main()
  .then(async () => {
    try {
      await sequelize.close();
    } catch {
      /* ignore */
    }
    process.exit(process.exitCode ?? 0);
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    try {
      await sequelize.close();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
