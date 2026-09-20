import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * WHAT THE NETWORK ACTUALLY PAID, FOR ONE POOL, FOR ONE WINDOW.
 *
 * Rewards in the on-chain product are OBSERVED, never computed. There is no
 * APR anywhere in this path: per Solana epoch the observer reads
 * `getInflationReward` for every stake account and cross-checks it against the
 * delegation, and per day the Lido observer reads `getPooledEthByShares`. The
 * delta between `valueBefore` and `valueAfter` IS the reward, and the share
 * price moves by it. A custodian that sets, guarantees or tops up a reward is
 * outside every safe harbour surveyed, so the prohibition is structural: the
 * REAL engine cannot import `calculateReward`, `recordPlatformLoss`,
 * `accruePositionReward` or `bookAutoCompoundMaturity`, and a source-scan test
 * holds that.
 *
 * `(poolId, window)` is UNIQUE. Re-running an observer for a window it has
 * already written must produce no second reward, no second commission and no
 * second earning row. `window` is the epoch number for Solana
 * (`epoch_<n>`) and the UTC date for Lido (`day_<YYYY-MM-DD>`), which is also
 * the `periodBucket` prefix on the earning rows this observation writes
 * (`observed_<chain>_<window>`).
 *
 * A NEGATIVE gross is a slashing or a penalty. It lowers the share price for
 * everyone pro rata and takes NO commission — commission is charged on positive
 * observed gross only — and it opens an incident.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingObservation
  extends Model<stakingObservationAttributes, stakingObservationCreationAttributes>
  implements stakingObservationAttributes
{
  id!: string;
  poolId!: string;
  chain!: string;
  /** `epoch_<n>` (Solana) or `day_<YYYY-MM-DD>` (Lido). Unique per pool. */
  window!: string;
  epoch!: number | null;
  observedAt!: Date;
  /** On-chain value of the pool's tranches before this window. */
  valueBefore!: number;
  /** On-chain value after. `grossReward` is the difference. */
  valueAfter!: number;
  grossReward!: number;
  /** Commission on positive gross only, minted as treasury shares. */
  commissionAmount!: number;
  commissionShares!: number;
  /** The reward left for holders. */
  netReward!: number;
  sharePriceBefore!: number;
  sharePriceAfter!: number;
  totalShares!: number;
  /** How many positions received an earning row from this observation. */
  positionsCredited!: number;
  /** JSON: the raw per-account readings, for the audit trail. */
  detail!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingObservation {
    return stakingObservation.init(
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
          validate: { notNull: { msg: "poolId: Pool ID cannot be null" } },
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
        },
        window: {
          type: DataTypes.STRING(64),
          allowNull: false,
          validate: { notEmpty: { msg: "window: Window must not be empty" } },
        },
        epoch: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        observedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        valueBefore: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("valueBefore"),
        },
        valueAfter: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("valueAfter"),
        },
        grossReward: {
          // SIGNED on purpose: a slashing is a negative observation.
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("grossReward"),
        },
        commissionAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("commissionAmount"),
          validate: { min: { args: [0], msg: "commissionAmount: Cannot be negative" } },
        },
        commissionShares: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("commissionShares"),
          validate: { min: { args: [0], msg: "commissionShares: Cannot be negative" } },
        },
        netReward: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("netReward"),
        },
        sharePriceBefore: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("sharePriceBefore"),
        },
        sharePriceAfter: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("sharePriceAfter"),
        },
        totalShares: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("totalShares"),
        },
        positionsCredited: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        detail: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingObservation",
        tableName: "staking_observations",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            // THE IDEMPOTENCY KEY. One observation per pool per window, ever.
            name: "staking_observations_pool_window_key",
            unique: true,
            fields: [{ name: "poolId" }, { name: "window" }],
          },
          { name: "staking_observations_observed_at_idx", fields: [{ name: "observedAt" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingObservation.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingObservation.hasMany(models.stakingEarningRecord, {
      foreignKey: "observationId",
      as: "earnings",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
