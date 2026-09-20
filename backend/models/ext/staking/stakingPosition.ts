import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * mysql2 returns every DECIMAL column as a STRING (Sequelize registers no
 * parser for DECIMAL and `decimalNumbers` is not enabled in src/db.ts). Without
 * coercion `position.amount + reward` performs STRING CONCATENATION rather than
 * addition — which silently produced NaN payouts in the settlement path and
 * garbage totals in the UI. These getters make the declared `number` type of
 * each attribute true at runtime, for backend arithmetic and for JSON responses
 * alike. Writes are unaffected: Sequelize still sends the exact decimal value.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingPosition
  extends Model<stakingPositionAttributes, stakingPositionCreationAttributes>
  implements stakingPositionAttributes
{
  // Primary key
  id!: string;

  // Foreign keys
  userId!: string;
  poolId!: string;
  /**
   * The pool DURATION TIER this position was opened against. Null on legacy
   * positions (and on stakes into a pool that publishes no tiers), which fall
   * back to the pool's own scalar terms.
   */
  durationId!: string | null;

  /**
   * Snapshot of the pool's product at stake time. The cron, the settlement
   * authority and every exit door read THIS, never the platform's live
   * `stakingMode`: the product a position was opened under is the product
   * that settles it.
   */
  mode!: "SYNTHETIC" | "REAL";

  // Position details
  amount!: number;
  startDate!: Date;
  /**
   * When a fixed-rate term ends. NULL for an on-chain position: there is no
   * term. The only clock on an on-chain stake is the protocol's unbonding, and
   * it starts at the unstake REQUEST — so `unbondingEndsAt` carries it, and
   * every predicate that reads `endDate` is fixed-rate by construction.
   */
  endDate!: Date | null;
  /**
   * THE STATE MACHINE, TWO PRODUCTS IN ONE COLUMN.
   *
   * Fixed-rate:  ACTIVE → PENDING_WITHDRAWAL → COMPLETED | CANCELLED
   * On-chain:    PENDING_DELEGATION → ACTIVE → UNSTAKE_REQUESTED → UNBONDING
   *              → WITHDRAWABLE → COMPLETED, plus FAILED reachable ONLY from
   *              PENDING_DELEGATION (the gather never landed; exact refund).
   *
   * The two vocabularies never mix: `PENDING_WITHDRAWAL` keeps its fixed-rate
   * meaning (an exit a human must review) and no on-chain row ever enters it,
   * because no human reviews a protocol exit. Once coins are on a chain, an
   * exit failure is a RETRY and never a failure.
   */
  status!:
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED"
    | "PENDING_WITHDRAWAL"
    | "PENDING_DELEGATION"
    | "UNSTAKE_REQUESTED"
    | "UNBONDING"
    | "WITHDRAWABLE"
    | "FAILED";

  // Withdrawal information
  withdrawalRequested!: boolean;
  withdrawalRequestDate!: Date | null;

  // Additional information
  adminNotes!: string | null;
  completedAt!: Date | null;

  // Economic-term snapshots captured at stake time so later admin edits to the
  // pool or the duration tier (apr / adminFeePercentage / earlyWithdrawalFee /
  // the payout schedule) cannot retroactively change a locked position's payout
  // or exit cost. Null on legacy rows -> fall back to the live pool value.
  apr!: number | null;
  adminFeePercentage!: number | null;
  earlyWithdrawalFee!: number | null;

  // Schedule snapshot. `earningFrequency` and `autoCompound` decide WHEN and HOW
  // a reward is paid, and both used to be read live off the pool — so flipping a
  // pool from DAILY to END_OF_TERM stopped an in-flight staker's payouts they
  // had already begun receiving, and flipping autoCompound on mid-term
  // reclassified their claimable earnings. With tiers these differ per position
  // within ONE pool, so they have to travel with the position regardless.
  // `lockPeriod` is redundant with (endDate - startDate) but recorded explicitly
  // so the agreed term survives any later date arithmetic.
  earningFrequency!: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM" | null;
  autoCompound!: boolean | null;
  lockPeriod!: number | null;

  // Reward-accrual watermark: the timestamp up to which REGULAR earnings have
  // already been distributed for this position. Null -> treat as startDate.
  lastDistributionDate!: Date | null;

  /*
   * ─────────────────────────────────────────────────────────────────────────
   * ON-CHAIN (mode = REAL) ONLY. NULL on every fixed-rate position.
   * ─────────────────────────────────────────────────────────────────────────
   */

  /** The disclosure this user accepted. NOT NULL in practice for REAL rows. */
  consentId!: string | null;
  /** The holder's claim on the pool, and the price it was bought at. */
  shares!: number | null;
  entrySharePrice!: number | null;
  /** Principal that actually reached the staking wallet, after the gather fee. */
  principalOnchain!: number | null;
  gatherTxHash!: string | null;
  returnTxHash!: string | null;
  gatherNetworkFee!: number | null;
  returnNetworkFee!: number | null;

  /**
   * The exit. `unstakeSharePrice` FREEZES at the request so a later
   * observation cannot re-price a queued exit upward; settlement pays
   * min(request price, finalization price), which is what every large
   * exchange and both liquid-staking protocols publish.
   */
  unstakeRequestedAt!: Date | null;
  unstakeShares!: number | null;
  unstakeSharePrice!: number | null;
  unbondingEndsAt!: Date | null;
  /** The worst case, recomputed daily and shown beside the estimate. */
  unbondingBoundAt!: Date | null;
  settledAmount!: number | null;
  settledAt!: Date | null;

  failureReason!: string | null;
  /** An admin may only FORCE an unstake, with a reason. Rewards are still paid. */
  forceUnstakedBy!: string | null;
  forceUnstakeReason!: string | null;

  gatherBatchId!: string | null;
  exitBatchId!: string | null;
  returnBatchId!: string | null;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Model initialization
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof stakingPosition {
    return stakingPosition.init(
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
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "poolId: Pool ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "poolId: Must be a valid UUID" },
          },
        },
        durationId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            // `isUUID` on a null value throws in Sequelize's validator chain,
            // so the guard has to be conditional — legacy positions and stakes
            // into a tier-less pool legitimately carry null here.
            isUUIDOrNull(value: string | null) {
              if (value === null || value === undefined) return;
              if (
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  value
                )
              ) {
                throw new Error("durationId: Must be a valid UUID");
              }
            },
          },
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          get: decimalGetter("amount"),
          validate: {
            isFloat: { msg: "amount: Must be a valid number" },
            min: { args: [0], msg: "amount: Cannot be negative" },
            isValidAmount(value: number) {
              if (value <= 0) {
                throw new Error("amount: Must be greater than 0");
              }
            },
          },
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: { msg: "startDate: Must be a valid date", args: true },
            isBeforeEndDate(value: Date) {
              // An on-chain position has no end date at all, so the rule is
              // conditional. It still holds for every fixed-rate row.
              const end = (this as any).endDate;
              if (end === null || end === undefined) return;
              if (new Date(value) >= new Date(end)) {
                throw new Error("startDate: Must be before end date");
              }
            },
          },
        },
        endDate: {
          // Nullable since the on-chain product: a position with no term has
          // no end date, and writing a fake one would make every fixed-rate
          // predicate that reads it silently true.
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: { msg: "endDate: Must be a valid date", args: true },
          },
        },
        mode: {
          type: DataTypes.ENUM("SYNTHETIC", "REAL"),
          allowNull: false,
          defaultValue: "SYNTHETIC",
          validate: {
            isIn: {
              args: [["SYNTHETIC", "REAL"]],
              msg: "mode: Must be one of: SYNTHETIC, REAL",
            },
          },
        },
        status: {
          type: DataTypes.ENUM(
            "ACTIVE",
            "COMPLETED",
            "CANCELLED",
            "PENDING_WITHDRAWAL",
            "PENDING_DELEGATION",
            "UNSTAKE_REQUESTED",
            "UNBONDING",
            "WITHDRAWABLE",
            "FAILED"
          ),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [
                [
                  "ACTIVE",
                  "COMPLETED",
                  "CANCELLED",
                  "PENDING_WITHDRAWAL",
                  "PENDING_DELEGATION",
                  "UNSTAKE_REQUESTED",
                  "UNBONDING",
                  "WITHDRAWABLE",
                  "FAILED",
                ],
              ],
              msg: "status: Must be a known position status",
            },
          },
        },
        withdrawalRequested: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        withdrawalRequestDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: {
              msg: "withdrawalRequestDate: Must be a valid date",
              args: true,
            },
            isValidWithdrawalDate(value: Date | null) {
              if (value && !this.withdrawalRequested) {
                throw new Error(
                  "withdrawalRequestDate: Cannot set withdrawal date when withdrawal is not requested"
                );
              }
            },
          },
        },
        adminNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: { msg: "completedAt: Must be a valid date", args: true },
            isValidCompletionDate(value: Date | null) {
              if (value && this.status !== "COMPLETED") {
                throw new Error(
                  "completedAt: Cannot set completion date when status is not COMPLETED"
                );
              }
            },
          },
        },
        apr: {
          type: DataTypes.DECIMAL(16, 8),
          allowNull: true,
          get: decimalGetter("apr"),
          validate: {
            isFloat: { msg: "apr: Must be a valid number" },
            min: { args: [0], msg: "apr: Cannot be negative" },
          },
        },
        adminFeePercentage: {
          type: DataTypes.DECIMAL(16, 8),
          allowNull: true,
          get: decimalGetter("adminFeePercentage"),
          validate: {
            isFloat: { msg: "adminFeePercentage: Must be a valid number" },
            min: { args: [0], msg: "adminFeePercentage: Cannot be negative" },
            max: {
              args: [100],
              msg: "adminFeePercentage: Cannot exceed 100%",
            },
          },
        },
        earlyWithdrawalFee: {
          type: DataTypes.DECIMAL(16, 8),
          allowNull: true,
          get: decimalGetter("earlyWithdrawalFee"),
          validate: {
            isFloat: { msg: "earlyWithdrawalFee: Must be a valid number" },
            min: { args: [0], msg: "earlyWithdrawalFee: Cannot be negative" },
            max: {
              args: [100],
              msg: "earlyWithdrawalFee: Cannot exceed 100%",
            },
          },
        },
        earningFrequency: {
          type: DataTypes.ENUM("DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"),
          allowNull: true,
          validate: {
            isIn: {
              args: [["DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"]],
              msg: "earningFrequency: Must be one of: DAILY, WEEKLY, MONTHLY, END_OF_TERM",
            },
          },
        },
        autoCompound: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        lockPeriod: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            isInt: { msg: "lockPeriod: Must be an integer" },
            min: { args: [1], msg: "lockPeriod: Must be at least 1 day" },
          },
        },
        lastDistributionDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: {
              msg: "lastDistributionDate: Must be a valid date",
              args: true,
            },
          },
        },
        consentId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        shares: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("shares"),
          validate: { min: { args: [0], msg: "shares: Cannot be negative" } },
        },
        entrySharePrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("entrySharePrice"),
          validate: { min: { args: [0], msg: "entrySharePrice: Cannot be negative" } },
        },
        principalOnchain: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("principalOnchain"),
          validate: { min: { args: [0], msg: "principalOnchain: Cannot be negative" } },
        },
        gatherTxHash: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        returnTxHash: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        gatherNetworkFee: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("gatherNetworkFee"),
        },
        returnNetworkFee: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("returnNetworkFee"),
        },
        unstakeRequestedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        unstakeShares: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("unstakeShares"),
          validate: { min: { args: [0], msg: "unstakeShares: Cannot be negative" } },
        },
        unstakeSharePrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("unstakeSharePrice"),
          validate: { min: { args: [0], msg: "unstakeSharePrice: Cannot be negative" } },
        },
        unbondingEndsAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        unbondingBoundAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        settledAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("settledAmount"),
          validate: { min: { args: [0], msg: "settledAmount: Cannot be negative" } },
        },
        settledAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        failureReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        forceUnstakedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        forceUnstakeReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        gatherBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        exitBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        returnBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingPosition",
        tableName: "staking_positions",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_positions_user_idx",
            fields: [{ name: "userId" }],
          },
          {
            name: "staking_positions_pool_idx",
            fields: [{ name: "poolId" }],
          },
          {
            name: "staking_positions_status_idx",
            fields: [{ name: "status" }],
          },
          {
            name: "staking_positions_withdrawal_idx",
            fields: [{ name: "withdrawalRequested" }],
          },
          {
            name: "staking_positions_user_status_idx",
            fields: [{ name: "userId" }, { name: "status" }],
          },
          {
            name: "staking_positions_end_date_idx",
            fields: [{ name: "endDate" }],
          },
          {
            name: "staking_positions_created_idx",
            fields: [{ name: "createdAt" }],
          },
          {
            name: "staking_positions_accrual_idx",
            fields: [{ name: "status" }, { name: "lastDistributionDate" }],
          },
          {
            name: "staking_positions_duration_idx",
            fields: [{ name: "durationId" }],
          },
          {
            name: "staking_positions_mode_status_idx",
            fields: [{ name: "mode" }, { name: "status" }],
          },
          {
            // The unbonding ladder, and the sweep that settles matured exits.
            name: "staking_positions_unbonding_idx",
            fields: [{ name: "status" }, { name: "unbondingEndsAt" }],
          },
          {
            // FIFO per pool: the exit queue is ordered by request time.
            name: "staking_positions_unstake_requested_idx",
            fields: [{ name: "poolId" }, { name: "unstakeRequestedAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingPosition.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // The tier this position was opened against. RESTRICT on the parent side
    // (stakingDuration.hasMany) so a tier holding principal cannot be deleted;
    // `required: false` at every call site because the association is null for
    // legacy positions and for pools that publish no tiers.
    stakingPosition.belongsTo(models.stakingDuration, {
      foreignKey: "durationId",
      as: "duration",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    stakingPosition.hasMany(models.stakingEarningRecord, {
      foreignKey: "positionId",
      as: "earningHistory",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    stakingPosition.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // The disclosure this position was opened against. RESTRICT: a consent is
    // the evidence that the holder was told the terms, and it outlives the
    // console that created it.
    stakingPosition.belongsTo(models.stakingConsent, {
      foreignKey: "consentId",
      as: "consent",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
