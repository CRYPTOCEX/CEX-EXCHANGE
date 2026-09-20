import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  CHAIN_ADDRESS_COLUMN_WIDTH,
  CHAIN_TX_ID_COLUMN_WIDTH,
  DEX_VM_VALUES,
  isAddressValidForVm,
  isTxIdValidForVm,
  normalizeChainAddressValue,
  normalizeChainTxIdValue,
  RAW_AMOUNT_RE,
} from "@b/utils/dex/units";

/**
 * The on-chain record. One table, one state machine, one poller: approvals,
 * wraps and unwraps are `kind` values rather than their own tables, because
 * they all need exactly the same confirmation/reorg handling and splitting
 * them would mean three pollers that drift.
 *
 * paranoid: false — a swap is an on-chain fact and cannot be deleted.
 *
 * See dexChain.ts for the terse-validate and JSON-in-TEXT conventions.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A TRANSACTION ID IS NOT ONE OBJECT, AND NEITHER IS AN ADDRESS.
 *
 * `txHash` was `STRING(66)` with `is: TX_HASH_RE` and an unconditional
 * `.toLowerCase()` setter; `fromAddress`, `toAddress` and `feeRecipient` were
 * `STRING(42)` with the EVM regex and the same fold. So a Solana swap could not
 * be recorded at all — an 88-character base58 signature overflows the column,
 * fails the regex, and is DESTROYED by the case fold, base58 using case as data.
 * The confirmation sweep grew Solana, TRON and TON pollers that were querying
 * for rows this table could not hold.
 *
 * The four ids are genuinely different objects, not four spellings of one:
 *
 *   EVM   32-byte keccak hash, `0x` + 64 hex, case-insensitive.
 *   SVM   a 64-byte ED25519 SIGNATURE, base58, 87–88 chars, CASE-SIGNIFICANT.
 *   TVM   32-byte hex with NO `0x` — the prefix is the entire difference from
 *         an EVM hash, so accepting it would let one validate as the other.
 *   TON   no single hash exists; a transaction is (account, logical time, hash).
 *         What is stored is the external MESSAGE hash, which is what
 *         toncenter's `msg_hash=` index is keyed by.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** See dexQuote.ts — the same validator, named per field for the message. */
function vmAddressValidator(field: string, optional: boolean) {
  return function (this: any, value: any) {
    if (optional && (value === null || value === undefined || value === "")) return;
    if (!isAddressValidForVm(this?.vm, String(value ?? ""))) {
      throw new Error(`dexSwap.${field} is not a valid ${this?.vm ?? "EVM"} address`);
    }
  };
}

function vmTxIdValidator(field: string, optional: boolean) {
  return function (this: any, value: any) {
    if (optional && (value === null || value === undefined || value === "")) return;
    if (!isTxIdValidForVm(this?.vm, String(value ?? ""))) {
      throw new Error(`dexSwap.${field} is not a valid ${this?.vm ?? "EVM"} transaction id`);
    }
  };
}
export default class dexSwap
  extends Model<dexSwapAttributes, dexSwapCreationAttributes>
  implements dexSwapAttributes
{
  id!: string;
  userId!: string;
  quoteId?: string | null;
  pairId?: string | null;
  kind!: string;
  chainId!: number;
  vm!: string;
  txHash!: string;
  nonce?: number | null;
  fromAddress!: string;
  toAddress?: string | null;
  sellTokenId?: string | null;
  buyTokenId?: string | null;
  sellAmountRaw?: string | null;
  buyAmountRaw?: string | null;
  realizedBuyAmountRaw?: string | null;
  sellAmountDisplay?: number | null;
  buyAmountDisplay?: number | null;
  realizedBuyAmountDisplay?: number | null;
  sellUsd?: number | null;
  buyUsd?: number | null;
  executionPrice?: number | null;
  slippageRealizedBps?: number | null;
  status!: string;
  statusReason?: string | null;
  statusHistory?: string | null;
  statusChangedAt?: Date | null;
  replacedByTxHash?: string | null;
  blockNumber?: number | null;
  blockHash?: string | null;
  blockTimestamp?: Date | null;
  confirmations!: number;
  gasUsed?: string | null;
  effectiveGasPrice?: string | null;
  gasCostNativeRaw?: string | null;
  gasCostUsd?: number | null;
  aggregator?: string | null;
  venueKind!: string;
  venueName?: string | null;
  poolId?: string | null;
  feeBps?: number | null;
  feeRecipient?: string | null;
  feeSide?: string | null;
  lastCheckedAt?: Date | null;
  checkAttempts!: number;
  reorgCheckedAt?: Date | null;
  confirmedAt?: Date | null;
  metadata?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexSwap {
    return dexSwap.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        quoteId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "NULL for an APPROVAL, which is not quoted",
        },
        pairId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        kind: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "SWAP",
          validate: { isIn: [["SWAP", "APPROVAL", "WRAP", "UNWRAP"]] },
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        /**
         * Which virtual machine, denormalised from the chain registry.
         *
         * Written by the record route from `chain.vm`, never from the client.
         * Defaults to EVM so rows predating the column stay correct without a
         * data migration — the addon was EVM-only until Solana.
         */
        vm: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: "EVM",
          validate: { isIn: [[...DEX_VM_VALUES]] },
          comment:
            "Decides what a transaction id and an address ARE on this row, and whether lowercasing either destroys it",
        },
        txHash: {
          type: DataTypes.STRING(CHAIN_TX_ID_COLUMN_WIDTH),
          allowNull: false,
          validate: { txIdMatchesVm: vmTxIdValidator("txHash", false) },
          set(value: any) {
            this.setDataValue("txHash", normalizeChainTxIdValue(value));
          },
          comment:
            "EVM: 0x + 64 hex. SVM: an 87-88 char base58 SIGNATURE. TVM: 64 bare hex. TON: the external MESSAGE hash, which is what toncenter's msg_hash index is keyed by — TON has no single transaction hash",
        },
        nonce: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment:
            "Sender nonce, persisted on first sighting. Required by the DROPPED rule: a pending tx whose nonce has already been consumed by a different hash was replaced, not lost. EVM ONLY — null on every other VM, which is why the drop rule falls back to elapsed time there",
        },
        fromAddress: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: { addressMatchesVm: vmAddressValidator("fromAddress", false) },
          set(value: any) {
            this.setDataValue("fromAddress", normalizeChainAddressValue(value));
          },
          comment:
            "The sender AS READ FROM THE CHAIN, never as claimed by the client — this is what ties an on-chain fact to a user",
        },
        toAddress: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: true,
          validate: { addressMatchesVm: vmAddressValidator("toAddress", true) },
          set(value: any) {
            this.setDataValue("toAddress", normalizeChainAddressValue(value));
          },
        },
        sellTokenId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        buyTokenId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        sellAmountRaw: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "As quoted",
        },
        buyAmountRaw: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "As quoted",
        },
        realizedBuyAmountRaw: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "Decoded from the receipt Transfer logs — what actually arrived",
        },
        sellAmountDisplay: {
          type: DataTypes.DECIMAL(38, 18),
          allowNull: true,
          get() {
            const v = this.getDataValue("sellAmountDisplay");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        buyAmountDisplay: {
          type: DataTypes.DECIMAL(38, 18),
          allowNull: true,
          get() {
            const v = this.getDataValue("buyAmountDisplay");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        realizedBuyAmountDisplay: {
          type: DataTypes.DECIMAL(38, 18),
          allowNull: true,
          get() {
            const v = this.getDataValue("realizedBuyAmountDisplay");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        sellUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("sellUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "USD snapshot at confirmation — display/aggregation only, LOSSY",
        },
        buyUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("buyUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "USD snapshot at confirmation — display/aggregation only, LOSSY",
        },
        executionPrice: {
          type: DataTypes.DECIMAL(38, 18),
          allowNull: true,
          get() {
            const v = this.getDataValue("executionPrice");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        slippageRealizedBps: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Signed: negative means the fill beat the quote",
        },
        status: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            // REPLACED was added in Phase 4 with a one-line edit, which is the
            // whole reason this column is STRING(16) + isIn rather than an
            // ENUM: there is no migration system here, schema comes from
            // Sequelize auto-sync, and adding a lifecycle state to an ENUM is a
            // table rewrite on a populated table under MySQL strict mode.
            isIn: [
              [
                "PENDING",
                "MINED",
                "CONFIRMED",
                "REVERTED",
                "DROPPED",
                "REPLACED",
                "REORGED",
              ],
            ],
          },
          comment:
            "PENDING (broadcast, unmined) -> MINED (in a block) -> CONFIRMED (past requiredConfirmations); REVERTED, DROPPED (nonce consumed elsewhere), REPLACED (the user's wallet sped it up or cancelled it) and REORGED are terminal and each needs a different user-facing message",
        },
        statusReason: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "Short machine slug, translated for display — never a raw provider string",
        },
        statusHistory: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "statusHistory",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("statusHistory");
            if (typeof v !== "string") return v ?? null;
            // A bare JSON.parse here throws from inside a GETTER, where no
            // caller has anywhere to catch it — an empty string, a truncated
            // write or a hand-edited row would 500 the history route rather
            // than render a swap with no audit trail. Unreadable history is an
            // absent history.
            try {
              return v.trim() ? JSON.parse(v) : null;
            } catch {
              return null;
            }
          },
          comment:
            'Append-only JSON array of "status", "at", "reason" entries. A "my swap says dropped" ticket is unanswerable without it, because status alone has already been overwritten',
        },
        statusChangedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        replacedByTxHash: {
          type: DataTypes.STRING(CHAIN_TX_ID_COLUMN_WIDTH),
          allowNull: true,
          validate: { txIdMatchesVm: vmTxIdValidator("replacedByTxHash", true) },
          set(value: any) {
            this.setDataValue("replacedByTxHash", normalizeChainTxIdValue(value));
          },
          comment:
            "Set with status=REPLACED: the id of the speed-up/cancel the user's wallet broadcast in this one's place. Client-reported (viem's onReplaced) and verified server-side by (fromAddress, nonce) — no RPC can be asked which transaction consumed a nonce. EVM ONLY in practice: replacement is a nonce mechanic, and no other VM here has one",
        },
        blockNumber: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        blockHash: {
          type: DataTypes.STRING(CHAIN_TX_ID_COLUMN_WIDTH),
          allowNull: true,
          /*
            NO REGEX, AND THAT IS THE HONEST ANSWER RATHER THAN A GAP.

            A "block hash" is not one object here. On EVM it is a 32-byte keccak
            hash; on Solana it is a base58 blockhash; on TRON the block ID's
            first four bytes are the block NUMBER, and `gettransactioninfobyid`
            does not return it at all — so the TRON poller stores "" to say NOT
            COMPARED rather than invent a value. TON has no analogue.

            The column's only consumer is the reorg tripwire, which compares this
            value against the chain's value AT THE SAME HEIGHT — a comparison of
            the field with itself. A shape check would add nothing to that and
            would refuse the deliberate empty string.

            Still normalised by value, so an EVM hash keeps its case fold and a
            base58 blockhash is not destroyed by one.
          */
          set(value: any) {
            this.setDataValue("blockHash", normalizeChainTxIdValue(value));
          },
          comment:
            "Reorg detection: a confirmed swap whose block hash no longer matches the chain at that height was reorged out. Empty string on TRON means NOT COMPARED — the API does not return one",
        },
        blockTimestamp: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        confirmations: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        gasUsed: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
        },
        effectiveGasPrice: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "Wei per gas unit",
        },
        gasCostNativeRaw: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "gasUsed * effectiveGasPrice, in wei",
        },
        gasCostUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("gasCostUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        aggregator: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment:
            'dexProvider.name, copied from the quote so the row survives a provider delete. A direct route writes "direct" — every NEW consumer reads venueKind',
        },
        venueKind: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "AGGREGATOR",
          validate: { isIn: [["AGGREGATOR", "DIRECT_POOL"]] },
          comment:
            "NOT NULL with a default, so every existing row stays valid with no compensating script",
        },
        venueName: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment: "The AMM deployment key on a direct route",
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            "Which pool filled this. SET NULL rather than RESTRICT: the swap record must outlive a pool archive",
        },
        feeBps: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Copied from the quote — the settings value may have moved since",
        },
        feeRecipient: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: true,
          validate: { addressMatchesVm: vmAddressValidator("feeRecipient", true) },
          set(value: any) {
            this.setDataValue("feeRecipient", normalizeChainAddressValue(value));
          },
        },
        feeSide: {
          type: DataTypes.STRING(8),
          allowNull: true,
          validate: { isIn: [["SELL", "BUY"]] },
        },
        lastCheckedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Poller cursor",
        },
        checkAttempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: "Drives the poller backoff, so one dead RPC does not pin the sweep",
        },
        reorgCheckedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        confirmedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "metadata",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("metadata");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
        },
      },
      {
        sequelize,
        modelName: "dexSwap",
        tableName: "dex_swap",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // The idempotency authority: the same hash submitted twice is one
            // swap. COMPOSITE, not txHash alone — a tx hash is
            // keccak256(rlp(signed tx)) and the identical signed transaction
            // can legitimately land on two EVM chains, so a single-column
            // unique index would turn the second chain's real swap into a
            // permanent 409.
            name: "dexSwapChainTxKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "txHash" }],
          },
          {
            name: "dexSwapUserCreatedIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "createdAt" }],
          },
          {
            // The 30s confirmation sweep selects on exactly these two columns
            // and table-scans dex_swap without it.
            name: "dexSwapPollerIdx",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "lastCheckedAt" }],
          },
          {
            /*
              THE SWEEP'S SECOND BRANCH, which dexSwapPollerIdx does not serve.

              `selectSweepBatch` also collects CONFIRMED rows that have never had
              a reorg check and settled before the pre-filter cutoff. That
              predicate is (status, reorgCheckedAt IS NULL, confirmedAt < ?) and
              nothing above covers it, so it range-scanned the whole trade
              history — which grows forever, because a settled swap stays
              CONFIRMED — every thirty seconds.

              `reorgCheckedAt` precedes `confirmedAt` deliberately: the IS NULL
              is an equality-shaped predicate and belongs before the range, or
              the range ends the usable prefix and `confirmedAt` never gets used.
            */
            name: "dexSwapReorgIdx",
            using: "BTREE",
            fields: [
              { name: "status" },
              { name: "reorgCheckedAt" },
              { name: "confirmedAt" },
            ],
          },
          {
            name: "dexSwapChainStatusIdx",
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "status" }],
          },
          {
            // The direct-venue reports and the "did any direct swap ever write a
            // fee accrual" invariant both select on this pair.
            name: "dexSwapVenueIdx",
            using: "BTREE",
            fields: [{ name: "venueKind" }, { name: "status" }],
          },
          {
            name: "dexSwapQuoteIdx",
            using: "BTREE",
            fields: [{ name: "quoteId" }],
          },
          {
            // The public trade tape for one market.
            name: "dexSwapPairTapeIdx",
            using: "BTREE",
            fields: [{ name: "pairId" }, { name: "status" }, { name: "confirmedAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    dexSwap.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    dexSwap.belongsTo(models.dexQuote, {
      as: "quote",
      foreignKey: "quoteId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    dexSwap.belongsTo(models.dexPair, {
      as: "pair",
      foreignKey: "pairId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    // SET NULL rather than RESTRICT: a swap must outlive its token rows,
    // and the display fields are already denormalised on the quote.
    dexSwap.belongsTo(models.dexToken, {
      as: "sellToken",
      foreignKey: "sellTokenId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    dexSwap.belongsTo(models.dexToken, {
      as: "buyToken",
      foreignKey: "buyTokenId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    dexSwap.hasMany(models.dexFeeAccrual, {
      as: "feeAccruals",
      foreignKey: "swapId",
    });
  }
}
