import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class transaction
  extends Model<transactionAttributes, transactionCreationAttributes>
  implements transactionAttributes
{
  id!: string;
  userId!: string;
  walletId!: string;
  /**
   * MUST list exactly the members of the `DataTypes.ENUM` below — the type
   * generator reads the COLUMN for enum columns, so any extra member here is a
   * value the class claims to hold and the database rejects.
   *
   * Four had drifted in: "REFUND_WITHDRAWAL", "BINARY_ORDER_WIN",
   * "TRADE_CREDIT" and "FEE". None of them is a transaction type — they are
   * WalletService OPERATION names (`src/services/wallet/types.ts`), and
   * `mapOperationTypeToTransactionType` converts each one before a row is
   * written: to "REFUND", "BINARY_ORDER", "EXCHANGE_ORDER" and "PLATFORM_FEE"
   * respectively. Nothing ever assigns them to this column, and MySQL would
   * refuse the write if it did. The same four names leaking into a query is
   * what silently stopped affiliate conditions from ever paying (see the note
   * in `api/(ext)/admin/affiliate/condition/overlap.ts`), so widening the ENUM
   * to match the annotation would have been the wrong direction: the
   * annotation was the lie.
   */
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
   * THE LEDGER CHAIN, as typed columns.
   *
   * MIRRORED, NOT USED. Nothing in this codebase reads or writes any of the six.
   * `WalletService.ts:576-584` keeps writing the same values into the `metadata`
   * JSON and keeps reading them back from there; migration M-014 (`0204_m014_
   * chain_columns` + `0205_m014_backfill_chain`) copies them into these columns
   * so conservation, audit and attribution become indexable SQL for the Rust
   * ledger, and MIGRATIONS.md M-014 says in as many words that "Rust keeps
   * writing `metadata` too".
   *
   * They are declared here for the same single reason `claimedBy`/`claimedAt`
   * below are: `Model.sync({alter})` issues `removeColumn` for every physical
   * column the model does not describe (`src/db.ts`), so without these six
   * declarations the next Node boot would drop the whole chain and the backfill
   * with it.
   *
   * The types match the migration exactly — `ENUM('IN','OUT','INTERNAL')`,
   * `DECIMAL(36,18)` and `VARCHAR(32)`, every one of them NULL. A mirror that
   * differs from the column it mirrors is not a mirror, it is an ALTER that runs
   * on every boot; a DECIMAL mirror that is NARROWER is worse still, because the
   * change it emits truncates.
   */
  flow?: "IN" | "OUT" | "INTERNAL" | null;
  previousBalance?: number | null;
  newBalance?: number | null;
  previousInOrder?: number | null;
  newInOrder?: number | null;
  operationType?: string | null;
  /**
   * WHICH WORKER HOLDS THIS ROW, and since when.
   *
   * MIRRORED, NOT USED. Nothing in this codebase reads or writes either column.
   * They are declared here for one reason: so that Sequelize's alter-sync does
   * not DELETE them.
   *
   * `Model.sync({alter})` walks the columns the database actually has and issues
   * `removeColumn` for every one the model does not describe (`src/db.ts`, and
   * sequelize's own `model.js` sync loop). The Rust custody dispatcher's claim
   * columns are added by migration `0302_m004_claimed` and written by the Rust
   * side alone — so without these two declarations, the next Node boot would
   * drop them, taking with them the record of which rows were mid-flight. A
   * claim is what stops a withdrawal being signed twice; deleting the column
   * that holds it, silently, on a routine restart, is the worst shape that
   * failure could take.
   *
   * The types match the migration exactly (`VARCHAR(64) NULL`, `DATETIME(3)
   * NULL`). A mirror that differs from the column it mirrors is not a mirror —
   * it is an ALTER that runs on every boot.
   */
  claimedBy?: string | null;
  claimedAt?: Date | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof transaction {
    return transaction.init(
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
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "ID of the user associated with this transaction",
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "walletId: Wallet ID cannot be null" },
          },
          comment: "ID of the wallet involved in this transaction",
        },
        type: {
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
            // Store orders used to fall through to the generic PAYMENT bucket,
            // so a purchase was indistinguishable from a fee in the buyer's
            // history and any report keyed on PAYMENT over-matched them.
            "ECOMMERCE_PURCHASE",
            // --- Everything below is the rest of that same clean-up. ---
            //
            // PAYMENT was the wallet service's fallback for any operation with no
            // type of its own (WalletService.mapOperationTypeToTransactionType),
            // so it simultaneously held customer payments, every platform fee,
            // treasury payouts, shipping/tax pass-throughs and admin bookkeeping
            // anchors. "SUM(amount) WHERE type='PAYMENT'" was therefore a number
            // with no meaning, and every type filter over-matched.
            //
            // These MUST stay appended at the END of the list: MySQL can widen an
            // ENUM in place only when new members are added after the existing
            // ones. Inserting in the middle renumbers the stored ordinals and
            // forces a full table rebuild of the largest table in the schema.
            //
            /** Fee PAID BY a user (exchange/bot trading fee, copy-trading performance fee) — a DEBIT. */
            "TRADING_FEE",
            /** Fee COLLECTED BY the platform into the Super Admin wallet — a CREDIT, and the row an adminProfit points at. */
            "PLATFORM_FEE",
            /** Treasury DEBIT when the house funds a user's win or eats a shortfall. Booked as a negative adminProfit. */
            "PLATFORM_LOSS",
            /** Shipping + tax collected on the operator's behalf. Money held, explicitly NOT profit. */
            "ORDER_PASSTHROUGH",
            /** A customer paying a merchant through the payment-gateway checkout. */
            "GATEWAY_PAYMENT",
            /** Buyer-side debit for a marketplace item (trading-bot strategies today). */
            "MARKETPLACE_PURCHASE",
            /** Seller-side credit for the same marketplace item. */
            "MARKETPLACE_SALE",
            /**
             * Not a money movement. Admin balance adjustments create a short-lived
             * PENDING row purely to mint a stable idempotency key; it is soft-deleted
             * as soon as the real credit/debit lands. Typed separately so an orphan
             * left behind by a crashed request is identifiable instead of looking
             * like a payment the user never made.
             */
            "ADJUSTMENT_ANCHOR"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                [
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
                  // Keep in lockstep with the ENUM above — a member missing here
                  // is rejected by the model even though the column accepts it.
                  "TRADING_FEE",
                  "PLATFORM_FEE",
                  "PLATFORM_LOSS",
                  "ORDER_PASSTHROUGH",
                  "GATEWAY_PAYMENT",
                  "MARKETPLACE_PURCHASE",
                  "MARKETPLACE_SALE",
                  "ADJUSTMENT_ANCHOR",
                ],
              ],
              msg: "type: Type must be one of the valid transaction types",
            },
          },
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
          validate: {
            isIn: {
              args: [
                [
                  "PENDING",
                  "COMPLETED",
                  "FAILED",
                  "CANCELLED",
                  "EXPIRED",
                  "REJECTED",
                  "REFUNDED",
                  "FROZEN",
                  "PROCESSING",
                  "TIMEOUT",
                ],
              ],
              msg: "status: Status must be one of ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'REFUNDED','FROZEN', 'PROCESSING', 'TIMEOUT']",
            },
          },
          comment: "Current status of the transaction",
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          validate: {
            isDecimal: { msg: "amount: Amount must be a number" },
          },
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
        // The six mirrored ledger-chain columns (M-014). See the field
        // declarations above for why they are here and why nothing in this tree
        // touches them. Every comment below is the migration's own COMMENT text:
        // a mirror whose comment differs is a `changeColumn` on every boot.
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
        // The two mirrored claim columns. See the field declarations above for
        // why they are here and why nothing in this tree touches them.
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
      },
      {
        sequelize,
        modelName: "transaction",
        tableName: "transaction",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "transactionReferenceIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "referenceId" }],
          },
          {
            name: "transactionWalletIdForeign",
            using: "BTREE",
            fields: [{ name: "walletId" }],
          },
          {
            name: "transactionUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "transaction_idempotency_key",
            unique: true,
            using: "BTREE",
            fields: [{ name: "idempotencyKey" }],
          },
          {
            name: "idx_txn_processing",
            using: "BTREE",
            fields: [
              { name: "type" },
              { name: "status" },
              { name: "createdAt" },
            ],
          },
          {
            name: "idx_status_trxid_recovery",
            using: "BTREE",
            fields: [
              { name: "status" },
              { name: "trxId" },
              { name: "createdAt" },
            ],
          },
          {
            // getFiltered orders every list by createdAt DESC. deletedAt leads
            // because paranoid makes it a constant `IS NULL` ref, which lets
            // MySQL walk createdAt in index order instead of filesorting.
            name: "idx_transaction_deletedAt_createdAt",
            using: "BTREE",
            fields: [{ name: "deletedAt" }, { name: "createdAt" }],
          },
          {
            // Per-user history: userId is the equality, deletedAt sits in the
            // middle as the constant IS NULL, so createdAt still sorts in order.
            name: "idx_txn_user_created",
            using: "BTREE",
            fields: [
              { name: "userId" },
              { name: "deletedAt" },
              { name: "createdAt" },
            ],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    transaction.hasOne(models.adminProfit, {
      as: "adminProfit",
      foreignKey: "transactionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    transaction.belongsTo(models.wallet, {
      as: "wallet",
      foreignKey: "walletId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    transaction.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
