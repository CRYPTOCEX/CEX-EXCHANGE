import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A DURATION TIER of a staking pool.
 *
 * One pool offers many lock terms, each with its OWN advertised yield and its
 * OWN payout schedule — "365 days at 10% paid at the end of the term", "90 days
 * at 8% paid weekly", and so on. Before this table a pool carried a single
 * `apr` / `lockPeriod` / `earningFrequency` triple, so an operator wanting two
 * terms had to publish two whole pools that then competed for the same
 * `availableToStake` capacity and were rejected by the one-ACTIVE-pool-per
 * (symbol, walletType) rule.
 *
 * The pool's own scalar columns are RETAINED as the fallback tier: a pool with
 * no rows here behaves exactly as it did before, and every read surface that
 * has not been taught about tiers keeps rendering a coherent headline. The
 * admin CRUD routes mirror the DEFAULT tier (lowest `order`) back onto those
 * pool columns whenever tiers are supplied, so the two can never disagree.
 *
 * mysql2 returns every DECIMAL as a STRING (see stakingPosition.ts for the full
 * rationale); the getters below make the declared `number` type true at runtime
 * so `apr / 100` is arithmetic rather than string coercion.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingDuration
  extends Model<stakingDurationAttributes, stakingDurationCreationAttributes>
  implements stakingDurationAttributes
{
  // Primary key
  id!: string;

  // Foreign key
  poolId!: string;

  /** Optional operator-facing label, e.g. "1 Year". Falls back to "N days". */
  name!: string | null;

  /** Lock term in DAYS. Drives the position's endDate. */
  lockPeriod!: number;

  /** Advertised annual yield for THIS term, in percent. */
  apr!: number;

  /** When rewards are credited for THIS term. */
  earningFrequency!: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";

  /**
   * Whether rewards for THIS term are folded into the principal and returned at
   * maturity instead of being credited as claimable earning rows. Null -> use
   * the pool's flag, which is what every pre-tier pool relies on.
   */
  autoCompound!: boolean | null;

  /**
   * Per-tier economics overrides. Null -> the pool value applies. These exist
   * because a longer lock is routinely priced differently on both sides: an
   * operator offering 365 days at 10% usually also wants a larger minimum and a
   * steeper exit penalty than on their 30-day tier.
   */
  minStake!: number | null;
  maxStake!: number | null;
  adminFeePercentage!: number | null;
  earlyWithdrawalFee!: number | null;

  /**
   * INACTIVE retires a tier without destroying it. A tier that has ever been
   * staked into MUST NOT be deleted — positions snapshot their terms but still
   * reference the row for history — so retirement is a status change.
   */
  status!: "ACTIVE" | "INACTIVE";

  /**
   * The term the pool ADVERTISES: its rate, length and schedule are mirrored
   * onto the pool's own columns, it is preselected on the staking form, and it
   * is what every surface that can only print one figure prints.
   *
   * Separate from `order` on purpose. Those are two different questions —
   * "which term do we lead with" and "what sequence do the terms read in" — and
   * one field answering both forces a bad trade: an operator promoting their
   * 365-day headline rate would have had to list it above the 30-day term, and
   * a ladder that does not run shortest-to-longest reads as a mistake.
   *
   * FALSE ON EVERY ROW IS A VALID STATE and is what a pool created before this
   * flag existed has. Resolution then falls through to the shortest ACTIVE
   * term, which is exactly what those pools already advertised — so there is
   * nothing to backfill and no pool changes behaviour by being upgraded.
   */
  isFeatured!: boolean;

  /**
   * Display order, maintained as ascending lock period by the admin form. It no
   * longer decides the headline — see `isFeatured` — and only survives as the
   * tiebreak that keeps list order stable.
   */
  order!: number;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof stakingDuration {
    return stakingDuration.init(
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
          validate: {
            notNull: { msg: "poolId: Pool ID cannot be null" },
          },
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        lockPeriod: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "lockPeriod: Must be an integer" },
            // Minimum 1 for the same reason stakingPool enforces it: a 0-day
            // term makes endDate equal startDate, which stakingPosition's
            // `isBeforeEndDate` validator rejects — so the tier would be
            // accepted by the admin form and then fail every user stake with an
            // opaque validation error.
            min: { args: [1], msg: "lockPeriod: Must be at least 1 day" },
            max: {
              args: [36500],
              msg: "lockPeriod: Must not exceed 36500 days (100 years)",
            },
          },
        },
        apr: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: false,
          get: decimalGetter("apr"),
          validate: {
            isFloat: { msg: "apr: Must be a valid number" },
            min: { args: [0], msg: "apr: Cannot be negative" },
          },
        },
        earningFrequency: {
          type: DataTypes.ENUM("DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"),
          allowNull: false,
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
          allowNull: true,
        },
        minStake: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
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
            isGreaterThanMinStake(value: number | null) {
              // Only comparable when BOTH bounds are overridden on this tier;
              // a tier max against the POOL min is checked in the route, which
              // is the only place that knows the pool.
              const min = (this as any).minStake;
              if (
                value !== null &&
                value !== undefined &&
                min !== null &&
                min !== undefined &&
                Number(value) <= Number(min)
              ) {
                throw new Error("maxStake: Must be greater than minStake");
              }
            },
          },
        },
        adminFeePercentage: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: true,
          get: decimalGetter("adminFeePercentage"),
          validate: {
            isFloat: { msg: "adminFeePercentage: Must be a valid number" },
            min: { args: [0], msg: "adminFeePercentage: Cannot be negative" },
            max: { args: [100], msg: "adminFeePercentage: Cannot exceed 100%" },
          },
        },
        earlyWithdrawalFee: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: true,
          get: decimalGetter("earlyWithdrawalFee"),
          validate: {
            isFloat: { msg: "earlyWithdrawalFee: Must be a valid number" },
            min: { args: [0], msg: "earlyWithdrawalFee: Cannot be negative" },
            max: { args: [100], msg: "earlyWithdrawalFee: Cannot exceed 100%" },
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "INACTIVE"]],
              msg: "status: Must be one of: ACTIVE, INACTIVE",
            },
          },
        },
        isFeatured: {
          // Not unique-per-pool at the schema level, and cannot be: MySQL has
          // no partial index, so a UNIQUE (poolId, isFeatured) would permit
          // exactly one NON-featured tier per pool — the precise opposite of
          // the constraint. "At most one ACTIVE featured tier" is enforced in
          // the admin CRUD, and resolution is defensive regardless.
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
      },
      {
        sequelize,
        modelName: "stakingDuration",
        tableName: "staking_durations",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_durations_pool_idx",
            fields: [{ name: "poolId" }],
          },
          {
            name: "staking_durations_pool_status_idx",
            fields: [{ name: "poolId" }, { name: "status" }],
          },
          // Deliberately NOT a unique index on (poolId, lockPeriod).
          //
          // The table is paranoid, so a retired tier keeps its row with
          // deletedAt set; MySQL treats NULLs in a unique index as DISTINCT, so
          // (poolId, lockPeriod, deletedAt) would happily admit two LIVE rows
          // (both deletedAt NULL) — the exact duplicate it was meant to stop —
          // while (poolId, lockPeriod) alone would make a soft-deleted tier
          // permanently block re-creating that term. One-term-per-pool is
          // enforced in the admin CRUD routes instead, which can distinguish
          // the two cases.
          {
            name: "staking_durations_pool_lock_idx",
            fields: [{ name: "poolId" }, { name: "lockPeriod" }],
          },
          {
            name: "staking_durations_order_idx",
            fields: [{ name: "order" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingDuration.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // RESTRICT, mirroring stakingPool -> stakingPosition: a tier that holds
    // user principal must never be destroyed out from under its positions.
    stakingDuration.hasMany(models.stakingPosition, {
      foreignKey: "durationId",
      as: "positions",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
