import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * mysql2 returns every DECIMAL column as a STRING (see stakingPosition.ts for
 * the full rationale). Coerce on read so pool economics behave as the declared
 * `number` type everywhere — notably `if (pool.maxStake)`, which was truthy for
 * the string "0", and every fee/APR multiplication.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingPool
  extends Model<stakingPoolAttributes, stakingPoolCreationAttributes>
  implements stakingPoolAttributes
{
  // Primary key
  id!: string;

  // Basic pool information
  name!: string;
  token!: string;
  symbol!: string;
  icon?: string;
  description!: string;
  walletType!: "FIAT" | "SPOT" | "ECO";
  walletChain?: string;

  /**
   * Which PRODUCT this pool belongs to. SYNTHETIC is the fixed-rate product
   * (a stake is a ledger row, the reward is a typed APR paid from the
   * treasury); REAL is custodial on-chain staking. Snapshotted at creation from
   * the platform's `stakingMode` and immutable once the pool holds a position:
   * the engine that settles a position is chosen by the ROW, never by the live
   * setting, so an operator switching products cannot re-price or strand a
   * position that was opened under the other one.
   */
  mode!: "SYNTHETIC" | "REAL";

  // Financial parameters
  apr!: number;
  lockPeriod!: number;
  minStake!: number;
  maxStake!: number | null;
  availableToStake!: number;
  earlyWithdrawalFee!: number;
  adminFeePercentage!: number;

  // Configuration
  status!: "ACTIVE" | "INACTIVE" | "COMING_SOON";
  isPromoted!: boolean;
  order!: number;
  earningFrequency!: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
  autoCompound!: boolean;

  // External information
  externalPoolUrl!: string;
  profitSource!: string;
  fundAllocation!: string;
  risks!: string;
  rewards!: string;

  /*
   * ─────────────────────────────────────────────────────────────────────────
   * ON-CHAIN (mode = REAL) ONLY. Every one is NULL or zero on a fixed-rate
   * pool and is written only by the on-chain engine.
   * ─────────────────────────────────────────────────────────────────────────
   */

  /** Which venue holds the coins. NULL on a fixed-rate pool. */
  venue!: "SOLANA_NATIVE" | "LIDO_STETH" | null;
  /** The chain activation this pool was created under. */
  activationId!: string | null;
  /** The dedicated staking key that signs for this pool. NEVER a master wallet. */
  stakingWalletId!: string | null;
  validatorSetId!: string | null;

  /*
   * POOL ACCOUNTING IN SHARES.
   *
   * `sharePrice = onchainValue / totalShares`. Rewards raise it, a slashing
   * lowers it, and commission is minted as SHARES to a treasury position
   * rather than credited as a balance — so the platform's take cannot exist
   * before the coins it is a share of exist. Pro-rata by stake time falls out
   * of the model with no special case, and a queued exit prices itself.
   *
   * INVARIANT: Σ position.shares (live positions plus the treasury position)
   * equals `totalShares`, and it is asserted by a property test.
   */
  totalShares!: number;
  sharePrice!: number;
  /** What the tranches plus the pool's unallocated wallet balance are worth. */
  onchainValue!: number;
  /**
   * Coins that belong to this pool's holders but sit undelegated in the
   * staking wallet: the surplus of a whole-tranche deactivation beyond what
   * the exits needed. Swept into a new tranche as soon as it reaches the
   * chain's minimum stake account.
   */
  unallocatedValue!: number;
  /** Commission minted as shares and not yet realised by a COMMISSION_EXIT. */
  treasuryShares!: number;
  lastObservedAt!: Date | null;
  lastObservedEpoch!: number | null;
  /** The OBSERVED trailing rate, in basis points. Never a promise, never typed. */
  trailingRewardRateBps!: number | null;

  /** Protocol timings, refreshed from the chain — never operator-typed. */
  activationDelaySeconds!: number | null;
  unbondingEstimateSeconds!: number | null;
  /** The worst case an exit can take, shown next to the estimate. */
  unbondingBoundSeconds!: number | null;

  /** The disclosure version a new stake must have accepted. */
  disclosureVersion!: string | null;
  /** A commission INCREASE takes effect only from this moment (notice period). */
  commissionEffectiveAt!: Date | null;
  /** The commission that applies once `commissionEffectiveAt` passes. */
  pendingAdminFeePercentage!: number | null;
  slashingPolicy!: "PASS_THROUGH" | "REIMBURSE_CAPPED" | null;
  slashingReimburseCap!: number | null;

  /**
   * The intake kill switch, separate from `status`.
   *
   * PAUSED stops NEW stakes and nothing else: observation, unbonding, claims,
   * returns and refunds continue. A regulator's "no new funds" order must be
   * one click and must never hold a customer's exit.
   */
  intakeStatus!: "OPEN" | "PAUSED";

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Model initialization
  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingPool {
    return stakingPool.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Pool name must not be empty" },
            len: {
              args: [2, 100],
              msg: "name: Length must be between 2 and 100 characters",
            },
          },
        },
        token: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "token: Token name must not be empty" },
          },
        },
        symbol: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
            len: {
              args: [1, 10],
              msg: "symbol: Length must be between 1 and 10 characters",
            },
          },
        },
        icon: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        walletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: false,
          defaultValue: "SPOT",
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO"]],
              msg: "walletType: Must be one of: FIAT, SPOT, ECO",
            },
          },
        },
        walletChain: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        mode: {
          // Default SYNTHETIC so every pool that existed before the column did
          // reads as the product it was: nothing on-chain ever backed it.
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
        apr: {
          type: DataTypes.DECIMAL(10, 8),
          // NULLABLE FOR ON-CHAIN POOLS. A fixed-rate term has no meaning on a
          // pool whose terms are the protocol's; the on-chain create route
          // writes NULL here by construction. The model validator below is what
          // keeps a fixed-rate pool from being saved without it.
          allowNull: true,
          get: decimalGetter("apr"),
          validate: {
            isFloat: { msg: "apr: Must be a valid number" },
            min: { args: [0], msg: "apr: Cannot be negative" },
          },
        },
        lockPeriod: {
          type: DataTypes.INTEGER,
          // NULLABLE FOR ON-CHAIN POOLS. A fixed-rate term has no meaning on a
          // pool whose terms are the protocol's; the on-chain create route
          // writes NULL here by construction. The model validator below is what
          // keeps a fixed-rate pool from being saved without it.
          allowNull: true,
          validate: {
            isInt: { msg: "lockPeriod: Must be an integer" },
            // Minimum 1, not 0: a zero-day lock makes endDate equal startDate,
            // which stakingPosition's `isBeforeEndDate` validator rejects — so
            // a 0-day pool accepts stakes in the admin UI but every user stake
            // then fails with an opaque validation error. Matches the admin
            // form's own `min(1)` rule.
            min: { args: [1], msg: "lockPeriod: Must be at least 1 day" },
          },
        },
        minStake: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          get: decimalGetter("minStake"),
          validate: {
            isFloat: { msg: "minStake: Must be a valid number" },
            min: { args: [0], msg: "minStake: Cannot be negative" },
          },
        },
        maxStake: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("maxStake"),
          validate: {
            isFloat: { msg: "maxStake: Must be a valid number" },
            min: { args: [0], msg: "maxStake: Cannot be negative" },
            isGreaterThanMinStake(value: number) {
              if (value !== null && value <= this.minStake) {
                throw new Error("maxStake: Must be greater than minStake");
              }
            },
          },
        },
        availableToStake: {
          type: DataTypes.DECIMAL(36, 18),
          // NULLABLE FOR ON-CHAIN POOLS. A fixed-rate term has no meaning on a
          // pool whose terms are the protocol's; the on-chain create route
          // writes NULL here by construction. The model validator below is what
          // keeps a fixed-rate pool from being saved without it.
          allowNull: true,
          defaultValue: 0,
          get: decimalGetter("availableToStake"),
          validate: {
            isFloat: { msg: "availableToStake: Must be a valid number" },
            min: { args: [0], msg: "availableToStake: Cannot be negative" },
          },
        },
        earlyWithdrawalFee: {
          type: DataTypes.DECIMAL(10, 8),
          // NULLABLE FOR ON-CHAIN POOLS. A fixed-rate term has no meaning on a
          // pool whose terms are the protocol's; the on-chain create route
          // writes NULL here by construction. The model validator below is what
          // keeps a fixed-rate pool from being saved without it.
          allowNull: true,
          defaultValue: 0,
          get: decimalGetter("earlyWithdrawalFee"),
          validate: {
            isFloat: { msg: "earlyWithdrawalFee: Must be a valid number" },
            min: { args: [0], msg: "earlyWithdrawalFee: Cannot be negative" },
            max: { args: [100], msg: "earlyWithdrawalFee: Cannot exceed 100%" },
          },
        },
        adminFeePercentage: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("adminFeePercentage"),
          validate: {
            isFloat: { msg: "adminFeePercentage: Must be a valid number" },
            min: { args: [0], msg: "adminFeePercentage: Cannot be negative" },
            max: { args: [100], msg: "adminFeePercentage: Cannot exceed 100%" },
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "INACTIVE", "COMING_SOON"),
          allowNull: false,
          defaultValue: "INACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "INACTIVE", "COMING_SOON"]],
              msg: "status: Must be one of: ACTIVE, INACTIVE, COMING_SOON",
            },
          },
        },
        isPromoted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "order: Must be an integer" },
            min: { args: [0], msg: "order: Cannot be negative" },
          },
        },
        earningFrequency: {
          type: DataTypes.ENUM("DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"),
          // NULLABLE FOR ON-CHAIN POOLS. A fixed-rate term has no meaning on a
          // pool whose terms are the protocol's; the on-chain create route
          // writes NULL here by construction. The model validator below is what
          // keeps a fixed-rate pool from being saved without it.
          allowNull: true,
          defaultValue: "DAILY",
          validate: {
            isIn: {
              args: [["DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"]],
              msg: "earningFrequency: Must be one of: DAILY, WEEKLY, MONTHLY, END_OF_TERM",
            },
          },
        },
        autoCompound: {
          type: DataTypes.BOOLEAN,
          // NULLABLE FOR ON-CHAIN POOLS. A fixed-rate term has no meaning on a
          // pool whose terms are the protocol's; the on-chain create route
          // writes NULL here by construction. The model validator below is what
          // keeps a fixed-rate pool from being saved without it.
          allowNull: true,
          defaultValue: false,
        },
        externalPoolUrl: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            isValidOptionalUrl(value: string) {
              // Only validate URL format if value is provided
              if (value && value.trim() !== "") {
                const urlRegex = /^https?:\/\/.+/i;
                if (!urlRegex.test(value)) {
                  throw new Error("externalPoolUrl: Must be a valid URL");
                }
              }
            },
          },
        },
        profitSource: {
          type: DataTypes.TEXT,
          // NULLABLE FOR ON-CHAIN POOLS. A fixed-rate term has no meaning on a
          // pool whose terms are the protocol's; the on-chain create route
          // writes NULL here by construction. The model validator below is what
          // keeps a fixed-rate pool from being saved without it.
          allowNull: true,
          validate: {
            notEmpty: { msg: "profitSource: Profit source must not be empty" },
          },
        },
        fundAllocation: {
          type: DataTypes.TEXT,
          // NULLABLE FOR ON-CHAIN POOLS. A fixed-rate term has no meaning on a
          // pool whose terms are the protocol's; the on-chain create route
          // writes NULL here by construction. The model validator below is what
          // keeps a fixed-rate pool from being saved without it.
          allowNull: true,
          validate: {
            notEmpty: {
              msg: "fundAllocation: Fund allocation must not be empty",
            },
          },
        },
        risks: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "risks: Risks must not be empty" },
          },
        },
        rewards: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "rewards: Rewards must not be empty" },
          },
        },
        venue: {
          type: DataTypes.ENUM("SOLANA_NATIVE", "LIDO_STETH"),
          allowNull: true,
          validate: {
            isIn: {
              args: [["SOLANA_NATIVE", "LIDO_STETH"]],
              msg: "venue: Must be one of: SOLANA_NATIVE, LIDO_STETH",
            },
          },
        },
        activationId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        stakingWalletId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        validatorSetId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        totalShares: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("totalShares"),
          validate: {
            min: { args: [0], msg: "totalShares: Cannot be negative" },
          },
        },
        sharePrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 1,
          get: decimalGetter("sharePrice"),
          validate: {
            min: { args: [0], msg: "sharePrice: Cannot be negative" },
          },
        },
        onchainValue: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("onchainValue"),
          validate: {
            min: { args: [0], msg: "onchainValue: Cannot be negative" },
          },
        },
        unallocatedValue: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("unallocatedValue"),
          validate: {
            min: { args: [0], msg: "unallocatedValue: Cannot be negative" },
          },
        },
        treasuryShares: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("treasuryShares"),
          validate: {
            min: { args: [0], msg: "treasuryShares: Cannot be negative" },
          },
        },
        lastObservedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastObservedEpoch: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        trailingRewardRateBps: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        activationDelaySeconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        unbondingEstimateSeconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        unbondingBoundSeconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        disclosureVersion: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        commissionEffectiveAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        pendingAdminFeePercentage: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: true,
          get: decimalGetter("pendingAdminFeePercentage"),
          validate: {
            min: { args: [0], msg: "pendingAdminFeePercentage: Cannot be negative" },
            max: { args: [100], msg: "pendingAdminFeePercentage: Cannot exceed 100%" },
          },
        },
        slashingPolicy: {
          type: DataTypes.ENUM("PASS_THROUGH", "REIMBURSE_CAPPED"),
          allowNull: true,
        },
        slashingReimburseCap: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("slashingReimburseCap"),
        },
        /*
          THE LIQUID EXIT, OFF UNTIL AN OPERATOR TURNS IT ON PER POOL.

          When on, an exit from this pool sells its stETH for ETH on a named
          Curve pool instead of joining Lido's withdrawal queue: the holder is
          paid in minutes rather than days, at a price that is the market's
          rather than the protocol's. The difference is real money and somebody
          bears it, which is why it is a per-pool switch with a stated cap and
          not a platform default.

          `liquidExitMaxSlippageBps` is the most the exit may lose against the
          protocol price before the engine refuses and falls back to the queue.
          100 bps = 1%.
        */
        liquidExitEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        liquidExitMaxSlippageBps: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
          validate: {
            isInt: { msg: "liquidExitMaxSlippageBps: Must be an integer" },
            min: { args: [1], msg: "liquidExitMaxSlippageBps: A cap of zero would refuse every exit" },
            max: { args: [1000], msg: "liquidExitMaxSlippageBps: A cap above 10% is not a cap" },
          },
        },
        intakeStatus: {
          // OPEN by default so every pool that existed before the column did
          // keeps accepting stakes exactly as it did.
          type: DataTypes.ENUM("OPEN", "PAUSED"),
          allowNull: false,
          defaultValue: "OPEN",
          validate: {
            isIn: {
              args: [["OPEN", "PAUSED"]],
              msg: "intakeStatus: Must be one of: OPEN, PAUSED",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "stakingPool",
        tableName: "staking_pools",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        validate: {
          /*
            THE NINE FIXED-RATE TERMS ARE MODE-CONDITIONAL, NOT OPTIONAL.

            `apr`, `lockPeriod`, `availableToStake`, `earlyWithdrawalFee`,
            `earningFrequency`, `autoCompound`, `externalPoolUrl`,
            `profitSource` and `fundAllocation` describe a rate the operator
            typed. On an on-chain pool there is no such rate — the terms come
            from the protocol and the chain activation — so the on-chain create
            route writes NULL into every one of them.

            The columns therefore cannot be NOT NULL. Column-level nullability
            cannot see `mode`, so the rule moves here, where it can: a REAL row
            must carry NULL, and a SYNTHETIC row must carry a value. Without
            this, flipping the columns nullable would have quietly allowed a
            fixed-rate pool with no rate and no lock — a pool that accepts
            money and can never pay out.

            `externalPoolUrl` is excluded from the SYNTHETIC half: it was
            already nullable before on-chain staking existed and is genuinely
            optional on a fixed-rate pool. It is still refused on a REAL row.
          */
          fixedRateTermsMatchMode(this: any) {
            const REAL_MUST_BE_NULL = [
              "apr",
              "lockPeriod",
              "availableToStake",
              "earlyWithdrawalFee",
              "earningFrequency",
              "autoCompound",
              "externalPoolUrl",
              "profitSource",
              "fundAllocation",
            ];
            // Absent or unknown mode reads as SYNTHETIC, exactly as D1 says.
            const isReal = String(this.mode ?? "SYNTHETIC").toUpperCase() === "REAL";

            if (isReal) {
              const set = REAL_MUST_BE_NULL.filter(
                (k) => this.getDataValue(k) !== null && this.getDataValue(k) !== undefined
              );
              if (set.length) {
                throw new Error(
                  `An on-chain pool has no fixed-rate terms: ${set.join(", ")} must be null.`
                );
              }
              return;
            }

            const missing = REAL_MUST_BE_NULL.filter(
              (k) => k !== "externalPoolUrl" && (this.getDataValue(k) === null || this.getDataValue(k) === undefined)
            );
            if (missing.length) {
              throw new Error(
                `A fixed-rate pool needs every rate term: ${missing.join(", ")} must not be null.`
              );
            }
          },
        },
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_pools_token_idx",
            fields: [{ name: "token" }],
          },
          {
            name: "staking_pools_status_idx",
            fields: [{ name: "status" }],
          },
          {
            name: "staking_pools_order_idx",
            fields: [{ name: "order" }],
          },
          {
            name: "staking_pools_mode_idx",
            fields: [{ name: "mode" }],
          },
          /*
            NO UNIQUE INDEX ON (symbol, walletType, mode), DELIBERATELY.

            The plan asks for uniqueness on that triple. The rule the product
            actually needs is narrower: at most one ACTIVE pool per asset per
            product. Multiple INACTIVE and COMING_SOON rows are wanted — that
            is how an operator drafts a replacement pool beside a live one.

            MySQL has no partial index, so a unique index on the triple would
            forbid the drafts too, and one scoped to `status` would still let
            two ACTIVE pools coexist as soon as one was soft-deleted. So the
            rule lives in the create and update routes, which check it against
            `status: "ACTIVE"` and can say WHY in a sentence. Written down
            because "why is there no index for this" is otherwise a question
            somebody re-asks every year.
          */
          {
            name: "staking_pools_intake_idx",
            fields: [{ name: "intakeStatus" }],
          },
          {
            name: "staking_pools_activation_idx",
            fields: [{ name: "activationId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // RESTRICT (not CASCADE): positions hold user principal and earning
    // history. Deleting a pool must never silently destroy them — callers must
    // settle/remove positions first (enforced additionally by a preDelete
    // guard on the delete endpoints).
    stakingPool.hasMany(models.stakingPosition, {
      foreignKey: "poolId",
      as: "positions",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    // Duration tiers. CASCADE is safe in the schema because the pool delete
    // endpoints already refuse to remove a pool that still has positions, and a
    // tier carries no money of its own — the RESTRICT that protects user funds
    // lives on stakingDuration -> stakingPosition.
    stakingPool.hasMany(models.stakingDuration, {
      foreignKey: "poolId",
      as: "durations",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    stakingPool.hasMany(models.stakingAdminEarning, {
      foreignKey: "poolId",
      as: "adminEarnings",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    stakingPool.hasMany(models.stakingExternalPoolPerformance, {
      foreignKey: "poolId",
      as: "performances",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // ── on-chain (REAL) relations ────────────────────────────────────────
    stakingPool.belongsTo(models.stakingChainActivation, {
      foreignKey: "activationId",
      as: "activation",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingPool.belongsTo(models.stakingChainWallet, {
      foreignKey: "stakingWalletId",
      as: "stakingWallet",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingPool.belongsTo(models.stakingValidatorSet, {
      foreignKey: "validatorSetId",
      as: "validatorSet",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    // RESTRICT everywhere below: a tranche is principal on a chain and an
    // observation is the evidence behind a payout. Neither may be destroyed
    // by deleting a row in an admin console.
    stakingPool.hasMany(models.stakingTranche, {
      foreignKey: "poolId",
      as: "tranches",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingPool.hasMany(models.stakingObservation, {
      foreignKey: "poolId",
      as: "observations",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingPool.hasMany(models.stakingBatch, {
      foreignKey: "poolId",
      as: "batches",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingPool.hasMany(models.stakingIncident, {
      foreignKey: "poolId",
      as: "incidents",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
