import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * COLD STORE FOR `transaction` ROWS OLDER THAN THE RETENTION CUTOFF.
 *
 * WHY THIS TABLE EXISTS (plans/done/ORDER-SCALE-10K.md WP-4.4, owner decision
 * section 11 item 2, option b). At the 10k-per-second target the ledger writes
 * tens of thousands of rows per second into `transaction` and
 * `wallet_audit_log`; growth, not throughput, is the operating limit, and the
 * live table carries nine indexes (two UNIQUE on random STRING keys) that every
 * INSERT and every DELETE has to maintain. Range partitioning would need the
 * partition key inside the UNIQUE indexes on idempotencyKey and referenceId, a
 * change of index semantics the owner has not taken. So retention is a job
 * (src/cron/ledger-archive.ts) that copies rows older than N days into this
 * table with `INSERT IGNORE ... SELECT` and HARD-deletes them from the live
 * table (the live model is `paranoid: true`, transaction.ts, so a soft delete
 * would be a second write to the largest table in the schema and would free
 * nothing).
 *
 * THE SHAPE IS THE LIVE TABLE'S SHAPE, COLUMN FOR COLUMN, TYPE FOR TYPE. The
 * copy is a SQL `INSERT ... SELECT` naming the same column list on both sides,
 * so a column that exists on one table and not the other breaks the copy, and
 * a type that differs would silently coerce. The unit suite
 * (e2e/unit/backend/wallet/ledger-archive.test.ts) initialises both models and
 * fails when an attribute name, SQL type, nullability or default differs. When
 * `transaction.ts` gains a column, this file gains the same column, in the
 * same place; the ENUM lists below are copies of the live ones and the type
 * generator reads THIS file's members for `TransactionArchiveAttributes`, so
 * an ENUM member missing here is a row the copy cannot land.
 *
 * WHAT IS DELIBERATELY DIFFERENT.
 *   - `timestamps: false`, `paranoid: false`. createdAt, updatedAt and
 *     deletedAt are ordinary columns here: the archive holds whatever the live
 *     row held, including the soft-deleted rows the live table hides, and no
 *     Sequelize hook may rewrite a timestamp on the way in.
 *   - Two indexes, PRIMARY and createdAt, instead of nine. The archive is
 *     written in bulk and read by date range (the conservation runner,
 *     scripts/ledger-conservation.mjs, and an operator's history lookup); the
 *     UNIQUE indexes are not carried because a soft-deleted live key
 *     legitimately replays into the live index (money_invariants.rs:2185) and
 *     the archive may therefore hold two rows with one key over time.
 *   - No associations and no foreign keys. A CASCADE from `user` or `wallet`
 *     must never reach into cold storage, and the live table's referrers
 *     (admin_profit, invoice, gateway_* : see the job) keep their FK on the
 *     LIVE row, which is why the job never archives a referenced row.
 */
export default class transactionArchive
  extends Model<transactionArchiveAttributes, transactionArchiveCreationAttributes>
  implements transactionArchiveAttributes
{
  id!: string;
  userId!: string;
  walletId!: string;
  type!:
    | "FAILED"
    | "DEPOSIT"
    | "WITHDRAW"
    | "OUTGOING_TRANSFER"
    | "INCOMING_TRANSFER"
    | "PAYMENT"
    | "REFUND"
    | "BINARY_ORDER"
    | "EXCHANGE_ORDER"
    | "FUTURES_ORDER"
    | "INVESTMENT"
    | "INVESTMENT_ROI"
    | "AI_INVESTMENT"
    | "AI_INVESTMENT_ROI"
    | "INVOICE"
    | "FOREX_DEPOSIT"
    | "FOREX_WITHDRAW"
    | "FX_TRADING_DEPOSIT"
    | "FX_TRADING_WITHDRAW"
    | "FOREX_INVESTMENT"
    | "FOREX_INVESTMENT_ROI"
    | "ICO_CONTRIBUTION"
    | "REFERRAL_REWARD"
    | "STAKING"
    | "STAKING_REWARD"
    | "P2P_OFFER_TRANSFER"
    | "P2P_TRADE"
    | "NFT_PURCHASE"
    | "NFT_SALE"
    | "NFT_MINT"
    | "NFT_BURN"
    | "NFT_TRANSFER"
    | "NFT_AUCTION_BID"
    | "NFT_AUCTION_SETTLE"
    | "NFT_OFFER"
    | "ECOMMERCE_PURCHASE"
    | "TRADING_FEE"
    | "PLATFORM_FEE"
    | "PLATFORM_LOSS"
    | "ORDER_PASSTHROUGH"
    | "GATEWAY_PAYMENT"
    | "MARKETPLACE_PURCHASE"
    | "MARKETPLACE_SALE"
    | "ADJUSTMENT_ANCHOR";
  status!:
    | "PENDING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "REJECTED"
    | "REFUNDED"
    | "FROZEN"
    | "PROCESSING"
    | "TIMEOUT";
  amount!: number;
  fee?: number;
  description?: string;
  metadata?: any;
  referenceId?: string | null;
  trxId?: string | null;
  idempotencyKey?: string | null;
  txHashPending?: string | null;
  /**
   * THE LEDGER-FLOW / BALANCE-AUDIT CHAIN, mirrored from `transaction.ts`.
   *
   * These six landed on the live model and not here, which is the exact drift
   * this file's header warns about — and it is not a cosmetic one. The copy is
   * an `INSERT ... SELECT` naming one column list on both sides, and
   * `cron/ledger-archive.ts::assertSameColumns` refuses to move a row while the
   * two models disagree, so LEDGER ARCHIVING WAS THROWING ON EVERY RUN for as
   * long as they were missing. Nothing was archived and nothing was lost; the
   * job simply stopped, which is the safe half of the failure.
   *
   * They are also what an archived row would have to keep to stay auditable:
   * `previousBalance`/`newBalance`/`previousInOrder`/`newInOrder` are the
   * wallet's before-and-after either side of the row, and conservation is
   * checked across live AND archived rows (scripts/ledger-conservation.mjs).
   * An archive that dropped them would answer that question with a hole.
   *
   * Types are copied exactly — `ENUM('IN','OUT','INTERNAL')`, `DECIMAL(36,18)`
   * and `VARCHAR(32)`, every one NULL. The live model's own note applies here
   * verbatim: a mirror that differs from the column it mirrors is not a mirror,
   * it is an ALTER that runs on every boot, and a narrower DECIMAL truncates.
   */
  flow?: "IN" | "OUT" | "INTERNAL" | null;
  previousBalance?: number | null;
  newBalance?: number | null;
  previousInOrder?: number | null;
  newInOrder?: number | null;
  operationType?: string | null;
  /**
   * The live table's claim columns, mirrored here for the SAME reason they are
   * mirrored on `transaction` — and for one more that is specific to this model.
   *
   * `cron/ledger-archive.ts::assertSameColumns` refuses to move a single row
   * when the two models disagree column for column, because the copy names the
   * archive's columns on both sides of the `INSERT ... SELECT`. Adding
   * `claimedBy`/`claimedAt` to the live model alone therefore does not merely
   * leave two values behind: it STOPS LEDGER ARCHIVING ALTOGETHER, with the
   * `ledgerArchive` job throwing on every run.
   *
   * Nothing here reads or writes them; see `transaction.ts` for the whole story.
   */
  claimedBy?: string | null;
  claimedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;

  public static initModel(sequelize: Sequelize.Sequelize): typeof transactionArchive {
    return transactionArchive.init(
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
          comment: "ID of the user associated with this transaction",
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: false,
          comment: "ID of the wallet involved in this transaction",
        },
        type: {
          // Same members, same order as transaction.ts: the archive column's
          // ENUM ordinals must accept every value the live column can hold.
          type: DataTypes.ENUM(
            "FAILED",
            "DEPOSIT",
            "WITHDRAW",
            "OUTGOING_TRANSFER",
            "INCOMING_TRANSFER",
            "PAYMENT",
            "REFUND",
            "BINARY_ORDER",
            "EXCHANGE_ORDER",
            "FUTURES_ORDER",
            "INVESTMENT",
            "INVESTMENT_ROI",
            "AI_INVESTMENT",
            "AI_INVESTMENT_ROI",
            "INVOICE",
            "FOREX_DEPOSIT",
            "FOREX_WITHDRAW",
            "FX_TRADING_DEPOSIT",
            "FX_TRADING_WITHDRAW",
            "FOREX_INVESTMENT",
            "FOREX_INVESTMENT_ROI",
            "ICO_CONTRIBUTION",
            "REFERRAL_REWARD",
            "STAKING",
            "STAKING_REWARD",
            "P2P_OFFER_TRANSFER",
            "P2P_TRADE",
            "NFT_PURCHASE",
            "NFT_SALE",
            "NFT_MINT",
            "NFT_BURN",
            "NFT_TRANSFER",
            "NFT_AUCTION_BID",
            "NFT_AUCTION_SETTLE",
            "NFT_OFFER",
            "ECOMMERCE_PURCHASE",
            "TRADING_FEE",
            "PLATFORM_FEE",
            "PLATFORM_LOSS",
            "ORDER_PASSTHROUGH",
            "GATEWAY_PAYMENT",
            "MARKETPLACE_PURCHASE",
            "MARKETPLACE_SALE",
            "ADJUSTMENT_ANCHOR"
          ),
          allowNull: false,
          comment: "Type of transaction (deposit, withdrawal, transfer, trading, NFT, etc.)",
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
            "EXPIRED",
            "REJECTED",
            "REFUNDED",
            "FROZEN",
            "PROCESSING",
            "TIMEOUT"
          ),
          allowNull: false,
          defaultValue: "PENDING",
          comment: "Current status of the transaction",
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          comment: "Transaction amount in the wallet's currency",
        },
        fee: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          defaultValue: 0,
          comment: "Fee charged for this transaction",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Human-readable description of the transaction",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Additional transaction data in JSON format",
        },
        referenceId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "External reference ID from payment processor or exchange",
        },
        trxId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "Blockchain transaction hash or ID",
        },
        idempotencyKey: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "Idempotency key for deduplication; nullable to allow non-idempotent operations",
        },
        txHashPending: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "Pre-broadcast / in-flight on-chain hash persisted before confirmation for crash recovery",
        },
        // Mirrored from the live model, types included: `assertSameColumns`
        // compares both sides before anything moves. See the field declarations.
        flow: {
          type: DataTypes.ENUM("IN", "OUT", "INTERNAL"),
          allowNull: true,
          comment:
            "Ledger direction, the typed twin of metadata.flow (LEDGER_FLOW in services/wallet/WalletService.ts)",
        },
        previousBalance: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "Wallet balance before this row",
        },
        newBalance: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "Wallet balance after this row",
        },
        previousInOrder: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "Wallet inOrder before this row",
        },
        newInOrder: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "Wallet inOrder after this row",
        },
        operationType: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment:
            "The verb that produced this row, the typed twin of metadata.operationType",
        },
        claimedBy: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment:
            "engine-lease instanceId of the custody worker holding this row; NULL means unclaimed and is the predicate the claim UPDATE turns on",
        },
        claimedAt: {
          type: DataTypes.DATE(3),
          allowNull: true,
          comment:
            "When the claim was taken, so a worker that died mid-send is found by an indexed range instead of withdrawalQueue.ts:366-368 five minute guess",
        },
        // The live table's timestamp columns as Sequelize creates them for a
        // `timestamps: true, paranoid: true` model: DATETIME NOT NULL twice and
        // a nullable DATETIME. Declared by hand so the archive never generates
        // its own values for them.
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "transactionArchive",
        tableName: "transaction_archive",
        timestamps: false,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "idx_transaction_archive_createdAt",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // None, on purpose: see the header. Cold storage carries no foreign keys.
  }
}
