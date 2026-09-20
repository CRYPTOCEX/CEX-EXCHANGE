import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  EVM_ADDRESS_RE,
  SIGNED_RAW_AMOUNT_RE,
  TX_HASH_RE,
} from "@b/utils/dex/units";

/**
 * APPEND-ONLY. The pool's own ledger: every log we decoded from a receipt we
 * verified.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY `dexFeeAccrual` CANNOT HOLD THIS.
 *
 * The obvious move is a `source` discriminator on the existing accrual table. It
 * does not work. `dexFeeAccrual.swapId` is `UUID NOT NULL, FK dexSwap, onDelete
 * RESTRICT`, and an LP-fee realisation HAS NO SWAP — it is ONE operator
 * transaction covering thousands of other people's swaps.
 *
 * Making `swapId` nullable would destroy the `UNIQUE (swapId, logIndex)`
 * identity that stops the confirmation sweep double-counting, because MYSQL
 * TREATS NULLS AS DISTINCT — the same NULL-distinctness the plan already had to
 * work around with a separate `UNIQUE (reversalOfId)` index. Hence this table,
 * with its own `UNIQUE (chainId, txHash, logIndex)`.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * [DECISION] THERE IS NO `SWEEP_SUBMITTED` STATE. Route 1 needs two on-chain
 * steps because the integrator fee lands at `feeRecipient` and must then be
 * swept. A V3 `collect()` ALREADY SENDS TOKENS TO AN ADDRESS THE OPERATOR NAMES
 * — the collect IS the sweep. Inventing a state for a transaction that does not
 * exist would leave rows permanently stuck in it.
 *
 * V2 FEES ARE STRUCTURALLY UNBOOKABLE, and this table records that rather than
 * hiding it: a V2 `Burn` writes a row with `feeAmountRaw = NULL` and
 * `sweepStatus = "NONE"`. There is no on-chain fact separating fee from
 * principal on a V2 position — the only expressible number is
 * `valueOut − valueIn`, which is fees MINUS impermanent loss, a single figure
 * that is neither. Booking it would make `DEX_LP_FEE` mean "fees, unless the
 * price moved, in which case something else."
 */
export default class dexPoolEvent
  extends Model<dexPoolEventAttributes, dexPoolEventCreationAttributes>
  implements dexPoolEventAttributes
{
  id!: string;
  poolId!: string;
  positionId?: string | null;
  kind!: string;
  chainId!: number;
  txHash!: string;
  logIndex!: number;
  blockNumber!: number;
  blockTimestamp?: Date | null;
  tokenAddress?: string | null;
  tokenSymbol?: string | null;
  tokenDecimals?: number | null;
  amount0Raw?: string | null;
  amount1Raw?: string | null;
  grossAmountRaw?: string | null;
  principalReturnedRaw?: string | null;
  feeAmountRaw?: string | null;
  amountUsd?: number | null;
  usdRateSource?: string | null;
  sweepStatus!: string;
  sweepAttempts!: number;
  creditedTransactionId?: string | null;
  adminProfitId?: string | null;
  creditedAmount?: number | null;
  roundingResidueRaw?: string | null;
  sweepFailureReason?: string | null;
  metadata?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexPoolEvent {
    return dexPoolEvent.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        positionId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Null for pool-level events (SWAP, SYNC) that belong to no position",
        },
        kind: {
          type: DataTypes.STRING(24),
          allowNull: false,
          validate: {
            isIn: [["CREATE", "MINT", "BURN", "COLLECT", "DECREASE_LIQUIDITY", "SWAP", "SYNC"]],
          },
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        txHash: {
          type: DataTypes.STRING(66),
          allowNull: false,
          validate: { is: TX_HASH_RE },
          set(value: any) {
            this.setDataValue(
              "txHash",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
        },
        logIndex: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment:
            "Which log in the receipt. Together with (chainId, txHash) this is the row's IDENTITY, which is what makes a re-run of the sweep non-double-counting by construction",
        },
        blockNumber: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        blockTimestamp: {
          type: DataTypes.DATE,
          allowNull: true,
          comment:
            "From the CHAIN's own block, never from a local clock. Block timestamps are seconds; the chart contract is milliseconds",
        },
        tokenAddress: {
          type: DataTypes.STRING(42),
          allowNull: true,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "tokenAddress",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment: "Denormalised — the report must survive a delist",
        },
        tokenSymbol: {
          type: DataTypes.STRING(32),
          allowNull: true,
          comment: "Denormalised — the report must survive a delist",
        },
        tokenDecimals: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: { min: 0, max: 36 },
          comment:
            "Denormalised. Without it a swept row cannot be re-derived from its raw amount once the token row is gone",
        },
        amount0Raw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment: "SIGNED — a burn is negative. 79 not 78 for the sign",
        },
        amount1Raw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment: "SIGNED — a burn is negative",
        },
        grossAmountRaw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment: "V3: the Collect amount for this token",
        },
        principalReturnedRaw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment:
            "V3: the sum of DecreaseLiquidity amounts since the last Collect. Subtracted from gross to leave the bookable fee",
        },
        feeAmountRaw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: {
            is: SIGNED_RAW_AMOUNT_RE,
            /**
             * `feeAmountRaw = gross − principal`, and a NEGATIVE result is
             * impossible: it would mean a collect returned less than the
             * principal credited to it.
             *
             * REJECTED HERE RATHER THAN CLAMPED TO ZERO. A clamp would turn an
             * arithmetic error — a missed DecreaseLiquidity, a mis-ordered
             * window — into a plausible-looking zero-fee row that nobody
             * investigates. The realisation path throws a named 500 instead.
             */
            notNegative(value: any) {
              if (value === null || value === undefined) return;
              if (String(value).trim().startsWith("-")) {
                throw new Error(
                  "dexPoolEvent.feeAmountRaw cannot be negative — a collect below its principal is an arithmetic error, not a zero fee"
                );
              }
            },
          },
          comment:
            "NULL on every V2 row, permanently: there is no on-chain fact separating fee from principal on a V2 burn",
        },
        amountUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("amountUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment:
            "display/aggregation only — LOSSY. A NULL means NO PRICE, never zero",
        },
        usdRateSource: {
          type: DataTypes.STRING(24),
          allowNull: true,
        },
        sweepStatus: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "NONE",
          validate: { isIn: [["NONE", "ACCRUED", "SWEPT", "UNRECOVERABLE"]] },
          comment:
            'NONE on every V2 row and on pool-level events. UNRECOVERABLE is expected rather than anomalous on this path: the operator\'s own token is precisely the symbol that is not in exchangeCurrency, and the sweep refuses by name rather than creating a wallet in a currency nothing can spend',
        },
        sweepAttempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment:
            "collectPlatformFee NEVER THROWS and returns null on failure. A null must not mark the group SWEPT — it stays ACCRUED, this increments, and at 5 the row goes UNRECOVERABLE",
        },
        creditedTransactionId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        adminProfitId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        creditedAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get() {
            const v = this.getDataValue("creditedAmount");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "What actually reached the wallet, after the 8-dp conversion",
        },
        roundingResidueRaw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment:
            "The base units dropped by that conversion. Recorded rather than discarded — the wallet service speaks in 8-dp Numbers and an 18-decimal amount does not fit",
        },
        sweepFailureReason: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          get() {
            const raw = this.getDataValue("metadata");
            if (raw === null || raw === undefined) return null;
            if (typeof raw === "object") return raw;
            try {
              return JSON.parse(raw as any);
            } catch {
              return null;
            }
          },
          set(value: any) {
            this.setDataValue(
              "metadata",
              value === null || value === undefined
                ? null
                : typeof value === "string"
                  ? value
                  : (JSON.stringify(value) as any)
            );
          },
          comment: "JSON-in-TEXT: prod MySQL pre-parses a real JSON column",
        },
      },
      {
        sequelize,
        modelName: "dexPoolEvent",
        tableName: "dex_pool_event",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
          {
            /*
              ONE SPECIFIC LOG IN ONE SPECIFIC RECEIPT — the same identity that
              makes Route 1's accrual re-runnable. This is what makes the indexer
              idempotent by construction rather than by a pre-flight check two
              racing writers would both pass.
            */
            name: "dexPoolEventTxLogKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "txHash" }, { name: "logIndex" }],
          },
          {
            // The settle cron's driving index.
            name: "dexPoolEventSweepIdx",
            using: "BTREE",
            fields: [{ name: "sweepStatus" }, { name: "chainId" }],
          },
          {
            name: "dexPoolEventPoolKindIdx",
            using: "BTREE",
            fields: [{ name: "poolId" }, { name: "kind" }, { name: "blockNumber" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    dexPoolEvent.belongsTo(models.dexPool, {
      as: "pool",
      foreignKey: "poolId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    /*
      SET NULL rather than RESTRICT: a pool-level SWAP event belongs to no
      position, and an event must survive a position being closed out.
    */
    dexPoolEvent.belongsTo(models.dexPoolPosition, {
      as: "position",
      foreignKey: "positionId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
