/**
 * seed-docs-demo — the personas every customer-facing documentation
 * screenshot is taken as.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * ~600 documentation pages are getting real screenshots of this platform. A
 * screenshot of an empty state teaches nothing and makes the product look
 * dead, so the surfaces the docs describe have to hold plausible content.
 *
 * The only rich account on a dev box is the owner's real one, which must never
 * reach a screenshot, and the e2e fixture users hold a single wallet each — so
 * /finance/wallet photographs as one lonely row.
 *
 * This script creates three OBVIOUSLY SYNTHETIC accounts (all @example.com):
 *
 *   CUSTOMER      ava.thornton@example.com    role User (4)        <- the star
 *   OPERATOR      ops.demo@example.com        role Super Admin (1)
 *   COUNTERPARTY  liam.osei@example.com       role User (4)
 *
 *   PASSWORD (all three):  DocsDemo!2026
 *
 * The counterparty is not decoration: a P2P trade and two off-platform
 * transfers each need a second side, and giving them a real account is what
 * lets BOTH legs of that money be written. Nothing screenshots as Liam.
 *
 * The operator is role 1 and NOT role 2 on purpose. The admin APIs answer an
 * Admin (2) with nothing, and the page then renders its own empty state, which
 * photographs as a data problem rather than as an empty account.
 *
 * ---------------------------------------------------------------------------
 * MONEY RECONCILES BY CONSTRUCTION
 * ---------------------------------------------------------------------------
 * Nothing here hand-picks a wallet balance. Every wallet is described as a
 * LEDGER — an ordered list of events, each of which becomes one `transaction`
 * row — and the wallet's stored numbers are then DERIVED:
 *
 *     equity  = SUM(event.delta)          (over every event in the ledger)
 *     inOrder = SUM(hold of every OPEN exchange order in that currency)
 *     balance = equity - inOrder
 *
 * `balance` and `inOrder` are separate pots on this platform: `inOrder` is
 * moved OUT of `balance` when an order opens (see the HOLD-model comment in
 * `src/api/finance/withdraw/spot/index.post.ts`). Adding them together, or
 * storing equity in `balance`, is the classic mistake here.
 *
 * `delta` is stated per event rather than inferred from `status`, because the
 * platform's own rules are not uniform and a reader WILL check the arithmetic:
 *
 *   - a COMPLETED deposit credits          -> delta = +amount - fee
 *   - a PENDING deposit has NOT credited   -> delta = 0
 *   - a PENDING withdrawal HAS ALREADY debited. The withdraw route deducts
 *     inside the same DB transaction that writes the row and only afterwards
 *     downgrades it to PENDING for the approval queue, so a pending withdrawal
 *     is money already gone  -> delta = -(amount + fee)
 *   - a REJECTED withdrawal was refunded   -> delta = 0
 *
 * Every internal transfer is written as a PAIR (OUTGOING_TRANSFER on the
 * source wallet, INCOMING_TRANSFER on the destination), including the two legs
 * that cross between Ava and Liam. Every FILLED exchange order is written as a
 * pair too (a debit in the quote asset, a credit in the base asset), so the
 * order blotter and the wallet page tell the same story.
 *
 * The script asserts no wallet lands negative, prints the whole reconciliation
 * table, and then re-reads what it stored and re-checks the arithmetic — so a
 * change to any number is caught before it reaches a screenshot.
 *
 * ---------------------------------------------------------------------------
 * IDEMPOTENCY
 * ---------------------------------------------------------------------------
 * `transaction.referenceId` and `transaction.idempotencyKey` both carry
 * PLATFORM-WIDE UNIQUE indexes, and `transaction` / `wallet` are PARANOID — a
 * soft-deleted row keeps its slot in the unique index and also keeps the
 * (userId, currency, type) wallet key occupied. A "just insert again" re-run
 * therefore fails on the second run, and a "soft delete then insert" re-run
 * fails on the third.
 *
 * So every run starts by HARD-deleting (`force: true`) everything this script
 * owns, then writes it fresh. Ownership is unambiguous: every id is derived
 * deterministically from a label under the `docs-demo:` namespace, so the
 * script can always name its own rows and can never name anyone else's.
 *
 * ---------------------------------------------------------------------------
 * USAGE  (from C:/xampp/htdocs/v5/backend)
 * ---------------------------------------------------------------------------
 *   seed:   npx tsx -r dotenv/config scripts/seed-docs-demo.ts dotenv_config_path=../.env
 *   undo:   npx tsx -r dotenv/config scripts/seed-docs-demo.ts dotenv_config_path=../.env --undo
 *   check:  npx tsx -r dotenv/config scripts/seed-docs-demo.ts dotenv_config_path=../.env --verify
 *
 * `--undo` removes every row this script writes INCLUDING the three user
 * accounts and the generated avatar files, leaving the database as it was.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT WILL NOT TOUCH
 * ---------------------------------------------------------------------------
 * johndoe3dmodeller@gmail.com — the owner's real personal account. The script
 * refuses to run if any id it is about to write resolves to that user, and it
 * never queries, updates or deletes outside its own id namespace.
 */

import { models, sequelize } from "@b/db";
import { hashPassword } from "@b/utils/passwords";
import { Op } from "sequelize";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const MODE_UNDO = process.argv.includes("--undo");
const MODE_VERIFY = process.argv.includes("--verify");

/** The one account that must never be read, written or photographed. */
const FORBIDDEN_EMAIL = "johndoe3dmodeller@gmail.com";

const PASSWORD = "DocsDemo!2026";

// ---------------------------------------------------------------------------
// Deterministic identity
// ---------------------------------------------------------------------------

/**
 * A stable UUID for a label, in the `docs-demo:` namespace.
 *
 * Deterministic ids are what make the purge honest: the script can enumerate
 * every row it has ever written without needing a marker column, a naming
 * convention in free text, or a record of the previous run. The version and
 * variant nibbles are forced so the value passes the models' `isUUID`
 * validators.
 */
function did(label: string): string {
  const h = createHash("sha256").update(`docs-demo:${label}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

const ref = (label: string) => `DOCS-DEMO-${label}`;
const idem = (label: string) => `docs-demo:${label}`;

const NOW = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;
/** A timestamp `d` days (and optionally `h` hours) in the past. */
const ago = (d: number, h = 0) => new Date(NOW - d * DAY - h * HOUR);
const ahead = (d: number, h = 0) => new Date(NOW + d * DAY + h * HOUR);

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

const CUSTOMER = {
  id: did("user:customer"),
  email: "ava.thornton@example.com",
  firstName: "Ava",
  lastName: "Thornton",
  username: "ava_thornton",
  roleId: 4,
  phone: "+15550142207",
  avatarFile: "docs-demo-ava-thornton.webp",
  avatarInitials: "AT",
  avatarFrom: "#3b82f6",
  avatarTo: "#8b5cf6",
};

const OPERATOR = {
  id: did("user:operator"),
  email: "ops.demo@example.com",
  firstName: "Morgan",
  lastName: "Reyes",
  username: "morgan_reyes",
  // Super Admin. Role 2 (Admin) is answered with nothing by the admin APIs and
  // the page then renders its own empty state.
  roleId: 1,
  phone: "+15550118804",
  avatarFile: "docs-demo-morgan-reyes.webp",
  avatarInitials: "MR",
  avatarFrom: "#0ea5e9",
  avatarTo: "#14b8a6",
};

const COUNTERPARTY = {
  id: did("user:counterparty"),
  email: "liam.osei@example.com",
  firstName: "Liam",
  lastName: "Osei",
  username: "liam_osei",
  roleId: 4,
  phone: "+15550176631",
  avatarFile: "docs-demo-liam-osei.webp",
  avatarInitials: "LO",
  avatarFrom: "#f59e0b",
  avatarTo: "#ef4444",
};

const PERSONAS = [CUSTOMER, OPERATOR, COUNTERPARTY];
const DEMO_USER_IDS = PERSONAS.map((p) => p.id);

// Rows this script owns outside the per-user tables.
const POOL_ID = did("staking:pool");
const POOL_DURATION_ID = did("staking:pool-duration");
const PLAN_ID = did("investment:plan");
const PLAN_DURATION_LONG_ID = did("investment:duration:30d");
const PLAN_DURATION_SHORT_ID = did("investment:duration:7d");
const PLAN_LINK_LONG_ID = did("investment:plan-duration:30d");
const PLAN_LINK_SHORT_ID = did("investment:plan-duration:7d");

const AVATAR_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "public",
  "uploads",
  "avatar"
);

// ---------------------------------------------------------------------------
// Wallet + ledger definitions
// ---------------------------------------------------------------------------

type WalletType = "FIAT" | "SPOT" | "ECO" | "FUTURES" | "COPY_TRADING";

interface LedgerEvent {
  /** Label -> deterministic id, referenceId and idempotencyKey. */
  key: string;
  type: string;
  status: string;
  /** The face amount of the transaction, as the user sees it in history. */
  amount: number;
  fee?: number;
  /**
   * The signed effect on the wallet's equity. Stated, never inferred — see the
   * header for why status alone does not decide this.
   */
  delta: number;
  at: Date;
  description: string;
  metadata?: Record<string, unknown>;
  trxId?: string;
}

interface WalletSpec {
  key: string;
  userId: string;
  type: WalletType;
  currency: string;
  /** Amount held by OPEN exchange orders, in this wallet's currency. */
  inOrder?: number;
  address?: Record<
    string,
    { address: string; network: string; balance: number }
  >;
  createdAt: Date;
  ledger: LedgerEvent[];
}

const C = CUSTOMER.id;
const L = COUNTERPARTY.id;

/**
 * Holds taken by Ava's OPEN orders. Declared once and used twice — to size the
 * `inOrder` pot and to write the order rows — so the two cannot drift.
 */
const OPEN_ORDER_HOLDS = {
  USDT: 918.75 + 177.6, // BTC buy + ZIL buy, both quoted in USDT
  TRX: 4000, // the TRX sell locks the base asset
};

const WALLETS: WalletSpec[] = [
  // ---------------------------------------------------------------- SPOT USDT
  {
    key: "ava:spot:usdt",
    userId: C,
    type: "SPOT",
    currency: "USDT",
    inOrder: OPEN_ORDER_HOLDS.USDT,
    createdAt: ago(96),
    ledger: [
      {
        key: "ava-usdt-dep-1",
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 9000,
        fee: 0,
        delta: 9000,
        at: ago(84),
        description: "Deposit of 9000 USDT (TRC20)",
        trxId: "0x9f2c41ad7be05b3c4a1d8e6f2093b7cc51ad02e7",
        metadata: { network: "TRC20", confirmations: 21 },
      },
      {
        key: "ava-usdt-dep-2",
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 12500,
        fee: 25,
        delta: 12500 - 25,
        at: ago(66),
        description: "Deposit of 12500 USDT (ERC20)",
        trxId: "0x3ba18cd0e97f21446d5a70b8c1e93f2a6d40b118",
        metadata: { network: "ERC20", confirmations: 34 },
      },
      {
        key: "ava-usdt-stake",
        type: "STAKING",
        status: "COMPLETED",
        amount: 4000,
        fee: 0,
        delta: -4000,
        at: ago(60),
        description: "Staked 4000 USDT — USDT Flexible Growth Pool",
        metadata: { poolId: POOL_ID },
      },
      {
        key: "ava-usdt-out-eco",
        type: "OUTGOING_TRANSFER",
        status: "COMPLETED",
        amount: 1420,
        fee: 0,
        delta: -1420,
        at: ago(47),
        description: "Transfer to Funding (ECO) wallet",
        metadata: { from: "SPOT/USDT", to: "ECO/USDT" },
      },
      {
        key: "ava-usdt-buy-btc",
        type: "EXCHANGE_ORDER",
        status: "COMPLETED",
        amount: 4184.18,
        fee: 4.18,
        delta: -(4184.18 + 4.18),
        at: ago(45),
        description: "BUY 0.0625 BTC/USDT @ 66946.88",
        metadata: {
          symbol: "BTC/USDT",
          side: "BUY",
          orderKey: "ava-order-btc-filled",
        },
      },
      {
        key: "ava-usdt-out-futures",
        type: "OUTGOING_TRANSFER",
        status: "COMPLETED",
        amount: 2000,
        fee: 0,
        delta: -2000,
        at: ago(38),
        description: "Transfer to Futures wallet",
        metadata: { from: "SPOT/USDT", to: "FUTURES/USDT" },
      },
      {
        key: "ava-usdt-p2p",
        type: "P2P_TRADE",
        status: "COMPLETED",
        amount: 1850,
        fee: 0,
        delta: 1850,
        at: ago(31),
        description: "P2P purchase settled — 1850 USDT released from escrow",
        metadata: { counterparty: "liam_osei", rail: "Bank Transfer" },
      },
      {
        key: "ava-usdt-stake-reward-1",
        type: "STAKING_REWARD",
        status: "COMPLETED",
        amount: 40,
        fee: 0,
        delta: 40,
        at: ago(30),
        description: "Staking reward — USDT Flexible Growth Pool (month 1)",
        metadata: { poolId: POOL_ID },
      },
      {
        key: "ava-usdt-sell-trx",
        type: "EXCHANGE_ORDER",
        status: "COMPLETED",
        amount: 349.63,
        fee: 0.35,
        delta: 349.63 - 0.35,
        at: ago(26),
        description: "SELL 2500 TRX/USDT @ 0.139852",
        metadata: {
          symbol: "TRX/USDT",
          side: "SELL",
          orderKey: "ava-order-trx-filled",
        },
      },
      {
        key: "ava-usdt-wd-1",
        type: "WITHDRAW",
        status: "COMPLETED",
        amount: 2000,
        fee: 25,
        delta: -(2000 + 25),
        at: ago(24),
        description: "Withdrawal of 2000 USDT to TRC20 address",
        trxId: "0xc41e5a09b7d3826f01ae5cb9d2740f83aa16e5d2",
        metadata: { network: "TRC20" },
      },
      {
        key: "ava-usdt-inv-closed",
        type: "INVESTMENT",
        status: "COMPLETED",
        amount: 800,
        fee: 0,
        delta: -800,
        at: ago(20),
        description: "Investment — Balanced Yield (30 days)",
      },
      {
        key: "ava-usdt-inv-closed-roi",
        type: "INVESTMENT_ROI",
        status: "COMPLETED",
        amount: 896,
        fee: 0,
        delta: 896,
        at: ago(20, -3),
        description: "Investment ROI: Balanced Yield - WIN",
        metadata: { result: "WIN", roi: 96 },
      },
      {
        key: "ava-usdt-buy-zrx",
        type: "EXCHANGE_ORDER",
        status: "COMPLETED",
        amount: 265.71,
        fee: 0.27,
        delta: -(265.71 + 0.27),
        at: ago(17),
        description: "BUY 850 ZRX/USDT @ 0.31260",
        metadata: {
          symbol: "ZRX/USDT",
          side: "BUY",
          orderKey: "ava-order-zrx-filled",
        },
      },
      {
        key: "ava-usdt-in-futures",
        type: "INCOMING_TRANSFER",
        status: "COMPLETED",
        amount: 500,
        fee: 0,
        delta: 500,
        at: ago(12),
        description: "Transfer from Futures wallet",
        metadata: { from: "FUTURES/USDT", to: "SPOT/USDT" },
      },
      {
        // REJECTED: the funds were returned, so this event moves nothing. It is
        // here because a docs table with one status in every row is worthless.
        key: "ava-usdt-wd-rejected",
        type: "WITHDRAW",
        status: "REJECTED",
        amount: 750,
        fee: 0,
        delta: 0,
        at: ago(9),
        description:
          "Withdrawal of 750 USDT — rejected, destination address failed screening",
        metadata: {
          network: "ERC20",
          rejectionReason: "Destination address failed screening",
        },
      },
      {
        key: "ava-usdt-stake-reward-2",
        type: "STAKING_REWARD",
        status: "COMPLETED",
        amount: 40,
        fee: 0,
        delta: 40,
        at: ago(2),
        description: "Staking reward — USDT Flexible Growth Pool (month 2)",
        metadata: { poolId: POOL_ID },
      },
      {
        key: "ava-usdt-inv-active",
        type: "INVESTMENT",
        status: "COMPLETED",
        amount: 1200,
        fee: 0,
        delta: -1200,
        at: ago(0, 1),
        description: "Investment — Balanced Yield (30 days)",
      },
      {
        // PENDING deposit: not credited yet, so delta 0.
        key: "ava-usdt-dep-pending",
        type: "DEPOSIT",
        status: "PENDING",
        amount: 900,
        fee: 0,
        delta: 0,
        at: ago(0, 9),
        description: "Deposit of 900 USDT — awaiting confirmations (4/12)",
        trxId: "0x77b0e2d1c4a938f5602bb1e07d4c3859ae21fd6b",
        metadata: { network: "ERC20", confirmations: 4, required: 12 },
      },
    ],
  },

  // ----------------------------------------------------------------- SPOT BTC
  {
    key: "ava:spot:btc",
    userId: C,
    type: "SPOT",
    currency: "BTC",
    createdAt: ago(96),
    ledger: [
      {
        key: "ava-btc-dep",
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 0.048,
        fee: 0.0002,
        delta: 0.048 - 0.0002,
        at: ago(72),
        description: "Deposit of 0.048 BTC",
        trxId:
          "6f1a1b0d4a9c9f2b70d5c81e3b2c4f7a95e0d31c8b4a7e26f0135d9c8a2b4e71",
        metadata: { network: "BTC", confirmations: 6 },
      },
      {
        key: "ava-btc-buy",
        type: "EXCHANGE_ORDER",
        status: "COMPLETED",
        amount: 0.0625,
        fee: 0,
        delta: 0.0625,
        at: ago(45),
        description: "BUY 0.0625 BTC/USDT @ 66946.88 — filled",
        metadata: {
          symbol: "BTC/USDT",
          side: "BUY",
          orderKey: "ava-order-btc-filled",
        },
      },
    ],
  },

  // ----------------------------------------------------------------- SPOT TRX
  {
    key: "ava:spot:trx",
    userId: C,
    type: "SPOT",
    currency: "TRX",
    inOrder: OPEN_ORDER_HOLDS.TRX,
    createdAt: ago(90),
    ledger: [
      {
        key: "ava-trx-dep",
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 12400,
        fee: 1,
        delta: 12400 - 1,
        at: ago(58),
        description: "Deposit of 12400 TRX",
        trxId:
          "a1c5e70b23d94f8615cb0a72d4e83f19b7602cd854af9e10b3c7d6208e514fa2",
        metadata: { network: "TRON", confirmations: 19 },
      },
      {
        key: "ava-trx-out-liam",
        type: "OUTGOING_TRANSFER",
        status: "COMPLETED",
        amount: 1500,
        fee: 0,
        delta: -1500,
        at: ago(33),
        description: "Transfer to liam_osei",
        metadata: { to: "liam_osei" },
      },
      {
        key: "ava-trx-sell",
        type: "EXCHANGE_ORDER",
        status: "COMPLETED",
        amount: 2500,
        fee: 0,
        delta: -2500,
        at: ago(26),
        description: "SELL 2500 TRX/USDT @ 0.139852 — filled",
        metadata: {
          symbol: "TRX/USDT",
          side: "SELL",
          orderKey: "ava-order-trx-filled",
        },
      },
    ],
  },

  // ----------------------------------------------------------------- SPOT ZRX
  {
    key: "ava:spot:zrx",
    userId: C,
    type: "SPOT",
    currency: "ZRX",
    createdAt: ago(40),
    ledger: [
      {
        key: "ava-zrx-buy",
        type: "EXCHANGE_ORDER",
        status: "COMPLETED",
        amount: 850,
        fee: 0,
        delta: 850,
        at: ago(17),
        description: "BUY 850 ZRX/USDT @ 0.31260 — filled",
        metadata: {
          symbol: "ZRX/USDT",
          side: "BUY",
          orderKey: "ava-order-zrx-filled",
        },
      },
    ],
  },

  // ----------------------------------------------------------------- FIAT USD
  {
    key: "ava:fiat:usd",
    userId: C,
    type: "FIAT",
    currency: "USD",
    createdAt: ago(96),
    ledger: [
      {
        key: "ava-usd-dep-1",
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 2500,
        fee: 74.75,
        delta: 2500 - 74.75,
        at: ago(79),
        description: "Card deposit of 2500.00 USD",
        metadata: { gateway: "Stripe", last4: "4242" },
      },
      {
        key: "ava-usd-dep-2",
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 1000,
        fee: 29.9,
        delta: 1000 - 29.9,
        at: ago(41),
        description: "Card deposit of 1000.00 USD",
        metadata: { gateway: "Stripe", last4: "4242" },
      },
      {
        // PENDING withdrawal: the withdraw route debits inside the same DB
        // transaction that writes this row and only afterwards downgrades it
        // to PENDING for the approval queue. The money is already out.
        key: "ava-usd-wd-pending",
        type: "WITHDRAW",
        status: "PENDING",
        amount: 600,
        fee: 5,
        delta: -(600 + 5),
        at: ago(3),
        description: "Bank withdrawal of 600.00 USD — awaiting approval",
        metadata: { method: "Bank Transfer", account: "•••• 8842" },
      },
    ],
  },

  // ----------------------------------------------------------------- FIAT EUR
  {
    key: "ava:fiat:eur",
    userId: C,
    type: "FIAT",
    currency: "EUR",
    createdAt: ago(70),
    ledger: [
      {
        key: "ava-eur-dep",
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 840,
        fee: 12.6,
        delta: 840 - 12.6,
        at: ago(62),
        description: "SEPA deposit of 840.00 EUR",
        metadata: { gateway: "SEPA" },
      },
    ],
  },

  // ------------------------------------------------------------------ ECO USDT
  {
    key: "ava:eco:usdt",
    userId: C,
    type: "ECO",
    currency: "USDT",
    createdAt: ago(50),
    address: {
      BSC: {
        address: "0xDD41c0F5A2b7E9ce3B62a1904f7D8e5B3c0a91Fe",
        network: "BSC",
        balance: 0,
      },
      POLYGON: {
        address: "0x18Ae7b39C2d05fA1063e9c4B7a2E0d1F8b46C3aD",
        network: "POLYGON",
        balance: 0,
      },
    },
    ledger: [
      {
        key: "ava-eco-in",
        type: "INCOMING_TRANSFER",
        status: "COMPLETED",
        amount: 1420,
        fee: 0,
        delta: 1420,
        at: ago(47),
        description: "Transfer from Spot wallet",
        metadata: { from: "SPOT/USDT", to: "ECO/USDT" },
      },
      {
        key: "ava-eco-out-liam",
        type: "OUTGOING_TRANSFER",
        status: "COMPLETED",
        amount: 260.5,
        fee: 0,
        delta: -260.5,
        at: ago(21),
        description: "Transfer to liam_osei",
        metadata: { to: "liam_osei" },
      },
    ],
  },

  // -------------------------------------------------------------- FUTURES USDT
  {
    key: "ava:futures:usdt",
    userId: C,
    type: "FUTURES",
    currency: "USDT",
    createdAt: ago(40),
    ledger: [
      {
        key: "ava-fut-in",
        type: "INCOMING_TRANSFER",
        status: "COMPLETED",
        amount: 2000,
        fee: 0,
        delta: 2000,
        at: ago(38),
        description: "Transfer from Spot wallet",
        metadata: { from: "SPOT/USDT", to: "FUTURES/USDT" },
      },
      {
        key: "ava-fut-out",
        type: "OUTGOING_TRANSFER",
        status: "COMPLETED",
        amount: 500,
        fee: 0,
        delta: -500,
        at: ago(12),
        description: "Transfer to Spot wallet",
        metadata: { from: "FUTURES/USDT", to: "SPOT/USDT" },
      },
    ],
  },

  // ------------------------------------------ counterparty (never screenshot)
  {
    key: "liam:spot:usdt",
    userId: L,
    type: "SPOT",
    currency: "USDT",
    createdAt: ago(80),
    ledger: [
      {
        key: "liam-usdt-dep",
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 5000,
        fee: 0,
        delta: 5000,
        at: ago(60),
        description: "Deposit of 5000 USDT (TRC20)",
        metadata: { network: "TRC20" },
      },
      {
        key: "liam-usdt-p2p",
        type: "P2P_TRADE",
        status: "COMPLETED",
        amount: 1850,
        fee: 0,
        delta: -1850,
        at: ago(31),
        description: "P2P sale settled — 1850 USDT released to buyer",
        metadata: { counterparty: "ava_thornton" },
      },
    ],
  },
  {
    key: "liam:spot:trx",
    userId: L,
    type: "SPOT",
    currency: "TRX",
    createdAt: ago(80),
    ledger: [
      {
        key: "liam-trx-in",
        type: "INCOMING_TRANSFER",
        status: "COMPLETED",
        amount: 1500,
        fee: 0,
        delta: 1500,
        at: ago(33),
        description: "Transfer from ava_thornton",
        metadata: { from: "ava_thornton" },
      },
    ],
  },
  {
    key: "liam:eco:usdt",
    userId: L,
    type: "ECO",
    currency: "USDT",
    createdAt: ago(80),
    address: {
      BSC: {
        address: "0x62B4cE07a19d8F3b5104aC7e28D0f9B1a34e7Cd0",
        network: "BSC",
        balance: 0,
      },
    },
    ledger: [
      {
        key: "liam-eco-in",
        type: "INCOMING_TRANSFER",
        status: "COMPLETED",
        amount: 260.5,
        fee: 0,
        delta: 260.5,
        at: ago(21),
        description: "Transfer from ava_thornton",
        metadata: { from: "ava_thornton" },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Exchange orders. The symbols are the four markets with status=1 here.
// ---------------------------------------------------------------------------

interface OrderSpec {
  key: string;
  symbol: string;
  status: "OPEN" | "CLOSED";
  type: "LIMIT" | "MARKET";
  side: "BUY" | "SELL";
  price: number;
  amount: number;
  filled: number;
  fee: number;
  feeCurrency: string;
  at: Date;
}

const ORDERS: OrderSpec[] = [
  {
    key: "ava-order-btc-filled",
    symbol: "BTC/USDT",
    status: "CLOSED",
    type: "LIMIT",
    side: "BUY",
    price: 66946.88,
    amount: 0.0625,
    filled: 0.0625,
    fee: 4.18,
    feeCurrency: "USDT",
    at: ago(45),
  },
  {
    key: "ava-order-trx-filled",
    symbol: "TRX/USDT",
    status: "CLOSED",
    type: "LIMIT",
    side: "SELL",
    price: 0.139852,
    amount: 2500,
    filled: 2500,
    fee: 0.35,
    feeCurrency: "USDT",
    at: ago(26),
  },
  {
    key: "ava-order-zrx-filled",
    symbol: "ZRX/USDT",
    status: "CLOSED",
    type: "MARKET",
    side: "BUY",
    price: 0.3126,
    amount: 850,
    filled: 850,
    fee: 0.27,
    feeCurrency: "USDT",
    at: ago(17),
  },
  {
    key: "ava-order-btc-open",
    symbol: "BTC/USDT",
    status: "OPEN",
    type: "LIMIT",
    side: "BUY",
    price: 61250,
    amount: 0.015, // holds 918.75 USDT
    filled: 0,
    fee: 0,
    feeCurrency: "USDT",
    at: ago(6),
  },
  {
    key: "ava-order-trx-open",
    symbol: "TRX/USDT",
    status: "OPEN",
    type: "LIMIT",
    side: "SELL",
    price: 0.142,
    amount: 4000, // holds 4000 TRX
    filled: 0,
    fee: 0,
    feeCurrency: "USDT",
    at: ago(4),
  },
  {
    key: "ava-order-zil-open",
    symbol: "ZIL/USDT",
    status: "OPEN",
    type: "LIMIT",
    side: "BUY",
    price: 0.0148,
    amount: 12000, // holds 177.60 USDT
    filled: 0,
    fee: 0,
    feeCurrency: "USDT",
    at: ago(1),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const money = (n: number, dp = 8) => Number(n.toFixed(dp));

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

/**
 * The safety interlock. Nothing in this script may resolve to the owner's real
 * account, and nothing may run against a database where one of the demo ids
 * has somehow been taken by a different email.
 */
async function assertSafe() {
  const owner = await models.user.findOne({
    where: { email: FORBIDDEN_EMAIL },
    attributes: ["id", "email"],
    paranoid: false,
  });
  if (owner && DEMO_USER_IDS.includes(owner.id)) {
    throw new Error(
      `REFUSING TO RUN: a demo id collides with ${FORBIDDEN_EMAIL}. Change the id namespace.`
    );
  }
  const squatters = await models.user.findAll({
    where: { id: DEMO_USER_IDS },
    attributes: ["id", "email"],
    paranoid: false,
  });
  for (const s of squatters) {
    const expected = PERSONAS.find((p) => p.id === s.id)!;
    if (s.email && s.email.toLowerCase() !== expected.email) {
      throw new Error(
        `REFUSING TO RUN: id ${s.id} is held by ${s.email}, not ${expected.email}.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Purge — every run starts here, and `--undo` is this plus the users.
// ---------------------------------------------------------------------------

async function purge(includeUsers: boolean) {
  const where = { userId: DEMO_USER_IDS };
  const hard = { force: true } as const;

  const positionIds = (
    await models.stakingPosition.findAll({
      where,
      attributes: ["id"],
      paranoid: false,
      raw: true,
    })
  ).map((r: any) => r.id);

  if (positionIds.length) {
    await models.stakingEarningRecord.destroy({
      where: { positionId: positionIds },
      ...hard,
    });
  }
  await models.stakingPosition.destroy({ where, ...hard });
  await models.investment.destroy({ where, ...hard });

  await models.p2pTrade.destroy({
    where: {
      [Op.or]: [{ buyerId: DEMO_USER_IDS }, { sellerId: DEMO_USER_IDS }],
    },
    ...hard,
  });
  await models.p2pOffer.destroy({ where, ...hard });

  await models.exchangeOrder.destroy({ where, ...hard });
  await models.transaction.destroy({ where, ...hard });
  await models.wallet.destroy({ where, ...hard });

  await models.supportTicket.destroy({ where, ...hard });
  await models.notification.destroy({ where, ...hard });
  await models.kycApplication.destroy({ where, ...hard });

  await models.stakingDuration.destroy({
    where: { id: POOL_DURATION_ID },
    ...hard,
  });
  await models.stakingPool.destroy({ where: { id: POOL_ID }, ...hard });

  await models.investmentPlanDuration.destroy({
    where: { id: [PLAN_LINK_LONG_ID, PLAN_LINK_SHORT_ID] },
  });
  await models.investmentPlan.destroy({ where: { id: PLAN_ID }, ...hard });
  // Only durations WE created (a pre-existing 30-DAY row is reused, never
  // owned, so it must survive the undo).
  await models.investmentDuration.destroy({
    where: { id: [PLAN_DURATION_LONG_ID, PLAN_DURATION_SHORT_ID] },
  });

  if (includeUsers) {
    await models.user.destroy({ where: { id: DEMO_USER_IDS }, ...hard });
    for (const p of PERSONAS) {
      const f = path.join(AVATAR_DIR, p.avatarFile);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }
}

// ---------------------------------------------------------------------------
// Avatars — generated, so the repo does not have to carry three binaries and
// so nobody's real face ends up in the documentation.
// ---------------------------------------------------------------------------

async function writeAvatars(): Promise<void> {
  let sharp: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sharp = require("sharp");
  } catch {
    log("  ! sharp unavailable — personas fall back to the initials avatar");
    return;
  }
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  for (const p of PERSONAS) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${p.avatarFrom}"/><stop offset="100%" stop-color="${p.avatarTo}"/>
      </linearGradient></defs>
      <rect width="512" height="512" fill="url(#g)"/>
      <text x="256" y="256" font-family="Segoe UI, Helvetica, Arial, sans-serif"
        font-size="220" font-weight="600" fill="#ffffff" fill-opacity="0.92"
        text-anchor="middle" dominant-baseline="central">${p.avatarInitials}</text>
    </svg>`;
    await sharp(Buffer.from(svg))
      .webp({ quality: 90 })
      .toFile(path.join(AVATAR_DIR, p.avatarFile));
  }
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  log("\n== users ==");
  const passwordHash = await hashPassword(PASSWORD);
  if (typeof passwordHash !== "string" || !passwordHash.startsWith("$argon2")) {
    throw new Error(
      `hashPassword did not return an argon2 hash: ${JSON.stringify(passwordHash)}`
    );
  }

  await writeAvatars();

  for (const p of PERSONAS) {
    await models.user.create({
      id: p.id,
      email: p.email,
      password: passwordHash,
      firstName: p.firstName,
      lastName: p.lastName,
      username: p.username,
      avatar: `/uploads/avatar/${p.avatarFile}`,
      emailVerified: true,
      phone: p.phone,
      phoneVerified: true,
      roleId: p.roleId,
      status: "ACTIVE",
      lastLogin: ago(0, 2),
      failedLoginAttempts: 0,
      profile: {
        bio:
          p.id === CUSTOMER.id
            ? "Long-term holder, occasional swing trader. Documentation demo account."
            : "Documentation demo account.",
        location: p.id === CUSTOMER.id ? "Lisbon, Portugal" : "Remote",
      },
      settings: { email: true, sms: false, push: true },
      createdAt: ago(96),
      updatedAt: ago(0, 2),
    } as any);
    log(`  + ${p.email}  role ${p.roleId}`);
  }

  // ------------------------------------------------------------------- KYC
  log("\n== kyc ==");
  const topLevel: any = await models.kycLevel.findOne({
    where: { status: "ACTIVE" },
    order: [["level", "DESC"]],
  });
  if (!topLevel) {
    log("  ! no ACTIVE kycLevel on this install — skipping");
  } else {
    await models.kycApplication.create({
      id: did("kyc:customer"),
      userId: CUSTOMER.id,
      levelId: topLevel.id,
      status: "APPROVED",
      data: {
        "full-name": "Ava Thornton",
        email: CUSTOMER.email,
        dob: "1991-04-17",
        country: "pt",
        "id-type": "passport",
        "id-number": "PT4482019",
        "id-expiry": "2031-02-09",
        "address-line1": "Rua da Prata 118",
        "address-line2": "3rd floor",
        city: "Lisbon",
        state: "Lisboa",
        "postal-code": "1100-415",
      },
      adminNotes: "Documents verified against the passport MRZ. Approved.",
      reviewedAt: ago(88),
      createdAt: ago(92),
      updatedAt: ago(88),
    } as any);
    log(`  + APPROVED at level ${topLevel.level} ("${topLevel.name}")`);
  }

  // --------------------------------------------------------------- wallets
  log("\n== wallets ==");
  const reconciliation: Array<Record<string, unknown>> = [];

  for (const w of WALLETS) {
    const equity = w.ledger.reduce((s, e) => s + e.delta, 0);
    const inOrder = w.inOrder ?? 0;
    const balance = money(equity - inOrder);

    if (balance < 0) {
      throw new Error(
        `Ledger for ${w.key} produces a NEGATIVE balance (${balance}). ` +
          `Fix the events, not the balance.`
      );
    }

    const id = did(`wallet:${w.key}`);

    await models.wallet.create({
      id,
      userId: w.userId,
      type: w.type,
      currency: w.currency,
      balance,
      inOrder: money(inOrder),
      address: w.address ?? null,
      status: true,
      createdAt: w.createdAt,
      updatedAt: ago(0, 1),
    } as any);

    for (const e of w.ledger) {
      await models.transaction.create({
        id: did(`txn:${e.key}`),
        userId: w.userId,
        walletId: id,
        type: e.type,
        status: e.status,
        amount: money(e.amount),
        fee: money(e.fee ?? 0),
        description: e.description,
        // TEXT column, NOT DataTypes.JSON — stringify here or the row stores
        // "[object Object]".
        metadata: JSON.stringify({ ...(e.metadata ?? {}), docsDemo: true }),
        referenceId: ref(e.key),
        trxId: e.trxId ?? null,
        idempotencyKey: idem(e.key),
        createdAt: e.at,
        updatedAt: e.at,
      } as any);
    }

    reconciliation.push({
      wallet: `${w.type}/${w.currency}`,
      who: w.userId === C ? "ava" : "liam",
      events: w.ledger.length,
      equity: money(equity),
      inOrder: money(inOrder),
      balance,
    });
  }
  // eslint-disable-next-line no-console
  console.table(reconciliation);

  // ---------------------------------------------------------------- orders
  log("== exchange orders ==");
  for (const o of ORDERS) {
    await models.exchangeOrder.create({
      id: did(`order:${o.key}`),
      referenceId: ref(o.key),
      userId: CUSTOMER.id,
      status: o.status,
      symbol: o.symbol,
      type: o.type,
      timeInForce: "GTC",
      side: o.side,
      price: o.price,
      average: o.filled > 0 ? o.price : null,
      amount: o.amount,
      filled: o.filled,
      remaining: money(o.amount - o.filled),
      cost: money(o.price * o.filled),
      fee: o.fee,
      feeCurrency: o.feeCurrency,
      trades: null,
      // DataTypes.JSON here (unlike transaction.metadata) — pass the object.
      metadata: { docsDemo: true },
      createdAt: o.at,
      updatedAt: o.at,
    } as any);
  }
  log(
    `  + ${ORDERS.filter((o) => o.status === "OPEN").length} OPEN, ` +
      `${ORDERS.filter((o) => o.status === "CLOSED").length} CLOSED`
  );

  // --------------------------------------------------------------- staking
  log("\n== staking ==");
  await models.stakingPool.create({
    id: POOL_ID,
    name: "USDT Flexible Growth Pool",
    token: "USDT",
    symbol: "USDT",
    icon: "/img/crypto/usdt.webp",
    description:
      "A conservative USDT pool with a 90-day lock and monthly payouts. " +
      "Rewards are funded from market-making spread captured on the platform's own books.",
    walletType: "SPOT",
    apr: 12,
    lockPeriod: 90,
    minStake: 100,
    maxStake: 50000,
    availableToStake: 250000,
    earlyWithdrawalFee: 5,
    adminFeePercentage: 0,
    status: "ACTIVE",
    isPromoted: true,
    order: 1,
    earningFrequency: "MONTHLY",
    autoCompound: false,
    profitSource: "Market-making spread captured on platform order books.",
    fundAllocation:
      "80% market making, 15% liquidity reserve, 5% insurance buffer.",
    risks:
      "Staked funds are locked for the full term. Early withdrawal incurs a 5% fee.",
    rewards: "12% APR paid monthly in USDT, credited to the Spot wallet.",
    createdAt: ago(120),
    updatedAt: ago(120),
  } as any);

  await models.stakingDuration.create({
    id: POOL_DURATION_ID,
    poolId: POOL_ID,
    name: "90 days",
    lockPeriod: 90,
    apr: 12,
    earningFrequency: "MONTHLY",
    autoCompound: false,
    minStake: 100,
    maxStake: 50000,
    adminFeePercentage: 0,
    earlyWithdrawalFee: 5,
    status: "ACTIVE",
    order: 1,
    isFeatured: true,
    createdAt: ago(120),
    updatedAt: ago(120),
  } as any);

  const positionId = did("staking:position");
  await models.stakingPosition.create({
    id: positionId,
    userId: CUSTOMER.id,
    poolId: POOL_ID,
    durationId: POOL_DURATION_ID,
    amount: 4000,
    startDate: ago(60),
    endDate: ahead(30),
    status: "ACTIVE",
    withdrawalRequested: false,
    withdrawalRequestDate: null,
    adminNotes: null,
    completedAt: null,
    apr: 12,
    adminFeePercentage: 0,
    earlyWithdrawalFee: 5,
    earningFrequency: "MONTHLY",
    autoCompound: false,
    lockPeriod: 90,
    lastDistributionDate: ago(2),
    createdAt: ago(60),
    updatedAt: ago(2),
  } as any);

  // Two claimed payouts of 40.00 — the exact pair of STAKING_REWARD rows in
  // the SPOT/USDT ledger above. 4000 * 12% / 12 months = 40.00.
  const payoutDates = [ago(30), ago(2)];
  for (let i = 0; i < payoutDates.length; i++) {
    const at = payoutDates[i];
    await models.stakingEarningRecord.create({
      id: did(`staking:earning:${i}`),
      positionId,
      amount: 40,
      type: "REGULAR",
      description: `Monthly staking reward — month ${i + 1}`,
      isClaimed: true,
      claimedAt: at,
      periodBucket: `${at.getUTCFullYear()}-${String(
        at.getUTCMonth() + 1
      ).padStart(2, "0")}`,
      createdAt: at,
      updatedAt: at,
    } as any);
  }
  log(
    "  + 1 pool, 1 duration, 1 ACTIVE position (4000 USDT), 2 claimed payouts"
  );

  // ------------------------------------------------------------ investments
  //
  // This ships its OWN plan rather than reusing one already on the box. Every
  // pre-existing plan here is either a hand-typed test row ("dawad", AFN, max
  // 11) or one of the `p1000001-…` fixtures, and `investment.planId` /
  // `durationId` carry an `isUUID` validator that those fixture ids FAIL — the
  // rows exist, but no investment can ever point at them. A docs plan of our
  // own is also the only way the plan card photographs as a product.
  log("\n== investments ==");
  await models.investmentPlan.create({
    id: PLAN_ID,
    name: "docs-demo-balanced-yield",
    title: "Balanced Yield",
    image: "/img/placeholder.svg",
    description:
      "A mid-risk USDT plan. Capital is deployed into market-making inventory " +
      "and returned with profit at the end of the term.",
    currency: "USDT",
    walletType: "SPOT",
    minAmount: 100,
    maxAmount: 10000,
    profitPercentage: 12,
    invested: 2,
    minProfit: 12,
    maxProfit: 1200,
    defaultProfit: 120,
    defaultResult: "WIN",
    trending: true,
    status: true,
    createdAt: ago(120),
    updatedAt: ago(120),
  } as any);

  // `investment_duration` is a SHARED lookup table with no unique key on
  // (duration, timeframe), so blindly inserting would grow a duplicate row on
  // every fresh install. Reuse a matching row when one exists; only create —
  // and therefore only ever delete — a row in our own id namespace.
  //
  // The reused row must itself be UUID-shaped. Several seeded fixtures here
  // carry ids like `d1000002-0000-…` which pass as a char(36) primary key but
  // FAIL `investment.durationId`'s `isUUID` validator, so pointing an
  // investment at one is rejected by the model even though the duration row is
  // perfectly real.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  async function ensureDuration(
    id: string,
    duration: number,
    timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH"
  ): Promise<string> {
    const existing: any[] = await models.investmentDuration.findAll({
      where: { duration, timeframe },
    });
    const usable = existing.find((d) => UUID_RE.test(String(d.id)));
    if (usable) return usable.id;
    await models.investmentDuration.create({ id, duration, timeframe } as any);
    return id;
  }

  const dLong = await ensureDuration(PLAN_DURATION_LONG_ID, 30, "DAY");
  const dShort = await ensureDuration(PLAN_DURATION_SHORT_ID, 7, "DAY");

  await models.investmentPlanDuration.create({
    id: PLAN_LINK_LONG_ID,
    planId: PLAN_ID,
    durationId: dLong,
  } as any);
  await models.investmentPlanDuration.create({
    id: PLAN_LINK_SHORT_ID,
    planId: PLAN_ID,
    durationId: dShort,
  } as any);

  await models.investment.create({
    id: did("investment:closed"),
    userId: CUSTOMER.id,
    planId: PLAN_ID,
    durationId: dShort,
    amount: 800,
    profit: 96,
    roiPercentage: 12,
    result: "WIN",
    status: "COMPLETED",
    endDate: ago(20, -3),
    createdAt: ago(20),
    updatedAt: ago(20, -3),
  } as any);
  await models.investment.create({
    id: did("investment:active"),
    userId: CUSTOMER.id,
    planId: PLAN_ID,
    durationId: dLong,
    amount: 1200,
    profit: null,
    roiPercentage: null,
    result: null,
    status: "ACTIVE",
    endDate: ahead(30),
    createdAt: ago(0, 1),
    updatedAt: ago(0, 1),
  } as any);
  log('  + plan "Balanced Yield", 1 COMPLETED (WIN +96), 1 ACTIVE (1200 USDT)');

  // -------------------------------------------------------------------- P2P
  log("\n== p2p ==");
  const rail: any =
    (await models.p2pPaymentMethod.findOne({
      where: { name: "Bank Transfer" },
    })) ?? (await models.p2pPaymentMethod.findOne());
  if (!rail) {
    log("  ! no p2p payment method on this install — skipping");
  } else {
    const offerId = did("p2p:offer");
    await models.p2pOffer.create({
      id: offerId,
      userId: COUNTERPARTY.id,
      type: "SELL",
      currency: "USDT",
      walletType: "SPOT",
      priceCurrency: "USD",
      amountConfig: { total: 5000, min: 100, max: 2500, availableBalance: 3150 },
      priceConfig: {
        model: "FIXED",
        value: 1.02,
        finalPrice: 1.02,
        currency: "USD",
      },
      tradeSettings: {
        autoCancel: 30,
        kycRequired: true,
        visibility: "PUBLIC",
        termsOfTrade:
          "Bank transfer only, from an account in your own name. Please quote the trade reference.",
      },
      locationSettings: { country: "PT" },
      userRequirements: { minCompletedTrades: 1, verifiedOnly: true },
      status: "ACTIVE",
      views: 214,
      escrowAmount: 0,
      createdAt: ago(45),
      updatedAt: ago(31),
    } as any);

    await models.p2pTrade.create({
      id: did("p2p:trade"),
      offerId,
      buyerId: CUSTOMER.id,
      sellerId: COUNTERPARTY.id,
      userId: CUSTOMER.id,
      type: "SELL",
      currency: "USDT",
      amount: 1850,
      price: 1.02,
      total: 1887,
      status: "COMPLETED",
      paymentMethod: rail.id,
      paymentDetails: {
        method: rail.name,
        reference: "DOCS-DEMO-P2P-1850",
      },
      timeline: [
        { event: "TRADE_CREATED", at: ago(31, 6).toISOString(), by: "buyer" },
        { event: "ESCROW_HELD", at: ago(31, 6).toISOString(), by: "system" },
        { event: "PAYMENT_SENT", at: ago(31, 5).toISOString(), by: "buyer" },
        {
          event: "PAYMENT_CONFIRMED",
          at: ago(31, 1).toISOString(),
          by: "seller",
        },
        { event: "ESCROW_RELEASED", at: ago(31).toISOString(), by: "system" },
        { event: "TRADE_COMPLETED", at: ago(31).toISOString(), by: "system" },
      ],
      terms: "Bank transfer only, from an account in your own name.",
      // Zero on purpose: the P2P fee payer is the BUYER, and a non-zero fee
      // here would have to appear as a debit in Ava's ledger to reconcile.
      escrowFee: "0",
      escrowTime: "30",
      paymentConfirmedAt: ago(31, 1),
      paymentReference: "DOCS-DEMO-P2P-1850",
      escrowAmount: 1850,
      escrowStatus: "RELEASED",
      completedAt: ago(31),
      createdAt: ago(31, 6),
      updatedAt: ago(31),
    } as any);
    log("  + 1 ACTIVE offer (liam), 1 COMPLETED trade (ava buys 1850 USDT)");
  }

  // ---------------------------------------------------------------- support
  log("\n== support ==");
  const ticketId = did("ticket:withdrawal");
  await models.supportTicket.create({
    id: ticketId,
    userId: CUSTOMER.id,
    agentId: OPERATOR.id,
    agentName: `${OPERATOR.firstName} ${OPERATOR.lastName}`,
    subject: "Why was my 750 USDT withdrawal rejected?",
    importance: "MEDIUM",
    status: "REPLIED",
    type: "TICKET",
    tags: ["withdrawal", "compliance"],
    messages: [
      {
        key: `${ticketId}-1`,
        type: "client",
        text:
          "I tried to withdraw 750 USDT on the 9th and it came back as rejected. " +
          "The balance went back into my Spot wallet, but I would like to understand " +
          "what went wrong before I try again.",
        time: ago(9, 2).toISOString(),
        userId: CUSTOMER.id,
        attachments: [],
      },
      {
        key: `${ticketId}-2`,
        type: "client",
        text:
          "The reference is DOCS-DEMO-ava-usdt-wd-rejected if that helps. " +
          "Nothing changed on my side between this attempt and the one before it.",
        time: ago(9, 1).toISOString(),
        userId: CUSTOMER.id,
        attachments: [],
      },
      {
        // The agent has the LAST word. `status: "REPLIED"` and
        // `lastMessageFrom: "agent"` are the same fact stated twice, and the
        // queue sorts on them — a thread whose newest message is the
        // customer's while the row claims REPLIED reads as a stuck ticket in
        // both the customer's list and the support desk.
        key: `${ticketId}-3`,
        type: "agent",
        text:
          "Thanks for reaching out. The destination address you used was flagged by our " +
          "screening provider, so the withdrawal was reversed automatically and the full " +
          "750 USDT was returned — no fee was charged. Sending to a different address will " +
          "go through normally. Happy to check an address for you before you submit it.",
        time: ago(8, 19).toISOString(),
        userId: OPERATOR.id,
        attachments: [],
      },
    ],
    // MINUTES, not seconds — the support surfaces render this verbatim with a
    // "min" suffix, so a value in seconds photographs as a 17-day reply time.
    // 7 hours between the customer's message and the agent's.
    responseTime: 420,
    satisfaction: 5,
    lastMessageAt: ago(8, 19),
    lastMessageFrom: "agent",
    createdAt: ago(9, 2),
    updatedAt: ago(8, 19),
  } as any);
  log("  + 1 REPLIED ticket with a 3-message thread");

  // ---------------------------------------------------------- notifications
  log("\n== notifications ==");
  const notifications = [
    {
      key: "n-kyc",
      type: "system",
      title: "Verification approved",
      message:
        "Your identity verification is complete. All features are now unlocked.",
      link: "/user/kyc",
      read: true,
      priority: "NORMAL",
      at: ago(88),
    },
    {
      key: "n-deposit",
      type: "alert",
      title: "Deposit confirmed",
      message: "12,500.00 USDT has been credited to your Spot wallet.",
      link: "/finance/wallet",
      read: true,
      priority: "NORMAL",
      at: ago(66),
    },
    {
      key: "n-order",
      type: "trade",
      title: "Order filled",
      message: "Your limit BUY of 0.0625 BTC/USDT filled at 66,946.88.",
      link: "/trade",
      read: true,
      priority: "NORMAL",
      at: ago(45),
    },
    {
      key: "n-p2p",
      type: "trade",
      title: "P2P trade completed",
      message: "1,850.00 USDT was released from escrow by liam_osei.",
      link: "/p2p/dashboard",
      read: true,
      priority: "NORMAL",
      at: ago(31),
    },
    {
      key: "n-withdraw-rejected",
      type: "alert",
      title: "Withdrawal rejected",
      message:
        "Your 750.00 USDT withdrawal was rejected and the funds were returned.",
      link: "/finance/history",
      read: true,
      priority: "HIGH",
      at: ago(9),
    },
    {
      key: "n-support",
      type: "system",
      title: "Support replied",
      message:
        "Morgan Reyes replied to your ticket about the rejected withdrawal.",
      link: "/support/ticket",
      read: false,
      priority: "NORMAL",
      at: ago(8, 19),
    },
    {
      key: "n-staking",
      type: "investment",
      title: "Staking reward credited",
      message: "40.00 USDT from USDT Flexible Growth Pool has been credited.",
      link: "/staking",
      read: false,
      priority: "NORMAL",
      at: ago(2),
    },
    {
      key: "n-deposit-pending",
      type: "alert",
      title: "Deposit detected",
      message: "900.00 USDT detected on-chain — 4 of 12 confirmations.",
      link: "/finance/wallet",
      read: false,
      priority: "NORMAL",
      at: ago(0, 9),
    },
  ];
  for (const n of notifications) {
    await models.notification.create({
      id: did(`notif:${n.key}`),
      userId: CUSTOMER.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      priority: n.priority,
      idempotencyKey: idem(n.key),
      createdAt: n.at,
      updatedAt: n.at,
    } as any);
  }
  log(
    `  + ${notifications.length} notifications ` +
      `(${notifications.filter((n) => !n.read).length} unread)`
  );
}

// ---------------------------------------------------------------------------
// Verify — re-read what is STORED and re-check the arithmetic.
// ---------------------------------------------------------------------------

async function verify() {
  log("\n== verification ==");
  let ok = true;

  for (const p of PERSONAS) {
    const u: any = await models.user.findByPk(p.id);
    if (!u) {
      log(`  FAIL user ${p.email} missing`);
      ok = false;
      continue;
    }
    log(
      `  ok   ${u.email}  role=${u.roleId} status=${u.status} ` +
        `verified=${u.emailVerified} avatar=${u.avatar}`
    );
  }

  const rows: Array<Record<string, unknown>> = [];
  for (const w of WALLETS) {
    const id = did(`wallet:${w.key}`);
    const row: any = await models.wallet.findByPk(id);
    if (!row) {
      log(`  FAIL wallet ${w.key} missing`);
      ok = false;
      continue;
    }
    // DECIMAL(36,18) comes back as a STRING. parseFloat, or every comparison
    // below silently becomes string concatenation.
    const balance = parseFloat(String(row.balance));
    const inOrder = parseFloat(String(row.inOrder ?? 0));

    const txns: any[] = await models.transaction.findAll({
      where: { walletId: id },
      raw: true,
    });
    const seen = new Set(txns.map((t) => t.referenceId));
    const missing = w.ledger.filter((e) => !seen.has(ref(e.key)));
    const expectedEquity = money(w.ledger.reduce((s, e) => s + e.delta, 0));
    const storedEquity = money(balance + inOrder);
    const good =
      Math.abs(storedEquity - expectedEquity) < 1e-8 &&
      missing.length === 0 &&
      txns.length === w.ledger.length;
    if (!good) ok = false;

    rows.push({
      wallet: `${w.type}/${w.currency}`,
      who: w.userId === C ? "ava" : "liam",
      balance,
      inOrder,
      storedEquity,
      expectedEquity,
      txns: `${txns.length}/${w.ledger.length}`,
      reconciles: good ? "yes" : "NO",
    });
  }
  // eslint-disable-next-line no-console
  console.table(rows);

  const counts: Record<string, number> = {
    exchangeOrder: await models.exchangeOrder.count({
      where: { userId: DEMO_USER_IDS },
    }),
    stakingPosition: await models.stakingPosition.count({
      where: { userId: DEMO_USER_IDS },
    }),
    stakingEarningRecord: await models.stakingEarningRecord.count({
      where: { positionId: did("staking:position") },
    }),
    investment: await models.investment.count({
      where: { userId: DEMO_USER_IDS },
    }),
    investmentPlan: await models.investmentPlan.count({
      where: { id: PLAN_ID },
    }),
    p2pTrade: await models.p2pTrade.count({ where: { buyerId: CUSTOMER.id } }),
    supportTicket: await models.supportTicket.count({
      where: { userId: DEMO_USER_IDS },
    }),
    notification: await models.notification.count({
      where: { userId: DEMO_USER_IDS },
    }),
    kycApplication: await models.kycApplication.count({
      where: { userId: DEMO_USER_IDS },
    }),
  };
  // eslint-disable-next-line no-console
  console.table(counts);
  for (const [k, v] of Object.entries(counts)) {
    if (v === 0) {
      log(`  FAIL ${k} has no rows`);
      ok = false;
    }
  }

  log(ok ? "\nVERIFY: PASS" : "\nVERIFY: FAIL");
  if (!ok) process.exitCode = 1;
}

// ---------------------------------------------------------------------------

async function main() {
  await sequelize.authenticate();
  await assertSafe();

  if (MODE_VERIFY) {
    await verify();
    return;
  }

  if (MODE_UNDO) {
    log("Removing the docs demo personas and everything they own...");
    await purge(true);
    log("Done. The three @example.com accounts and their data are gone.");
    return;
  }

  log(
    "Seeding the docs demo personas (re-runnable: purging any previous run first)..."
  );
  await purge(true);
  await seed();
  await verify();

  log("\n---------------------------------------------------------------");
  log("  CUSTOMER      ava.thornton@example.com   /  DocsDemo!2026");
  log("  OPERATOR      ops.demo@example.com       /  DocsDemo!2026  (Super Admin)");
  log("  COUNTERPARTY  liam.osei@example.com      /  DocsDemo!2026  (never screenshot)");
  log("---------------------------------------------------------------");
  log(
    "  undo:  npx tsx -r dotenv/config scripts/seed-docs-demo.ts dotenv_config_path=../.env --undo"
  );
}

main()
  .then(async () => {
    await sequelize.close();
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
