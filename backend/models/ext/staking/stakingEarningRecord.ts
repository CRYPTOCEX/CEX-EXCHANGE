import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class stakingEarningRecord
  extends Model<
    stakingEarningRecordAttributes,
    stakingEarningRecordCreationAttributes
  >
  implements stakingEarningRecordAttributes
{
  // Primary key
  id!: string;

  // Foreign key
  positionId!: string;

  // Earning details
  amount!: number;
  type!: "REGULAR" | "BONUS" | "REFERRAL";

  /**
   * How this earning reaches the holder.
   *
   *   CLAIMABLE  the fixed-rate product: the row is a platform liability the
   *              user claims into their wallet.
   *   COMPOUNDED the on-chain product: nothing is claimable. The reward is
   *              already in the pool's on-chain value and the row exists so the
   *              user can SEE what the network paid. It is received on unstake.
   *
   * NULL on rows written before the column, which are all fixed-rate and are
   * read as CLAIMABLE by `isClaimed`, exactly as they were.
   */
  settlement!: "CLAIMABLE" | "COMPOUNDED" | null;
  /** The observation that produced this row. NULL for fixed-rate accrual. */
  observationId!: string | null;
  description!: string;
  isClaimed!: boolean;
  claimedAt!: Date | null;

  // Distribution-cycle de-duplication key. For REGULAR/periodic accrual rows
  // this encodes the (engine, period) the row settles, so a position can be
  // credited at most once per period across all reward engines. Null for
  // one-off BONUS/REFERRAL rows, which remain additive.
  periodBucket!: string | null;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Model initialization
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof stakingEarningRecord {
    return stakingEarningRecord.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        positionId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "positionId: Position ID cannot be null" },
          },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount: Must be a valid number" },
            min: { args: [0], msg: "amount: Cannot be negative" },
          },
        },
        type: {
          type: DataTypes.ENUM("REGULAR", "BONUS", "REFERRAL"),
          allowNull: false,
          defaultValue: "REGULAR",
          validate: {
            isIn: {
              args: [["REGULAR", "BONUS", "REFERRAL"]],
              msg: "type: Must be one of: REGULAR, BONUS, REFERRAL",
            },
          },
        },
        description: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        isClaimed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        claimedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            // Keep claimedAt and isClaimed coherent: a claim timestamp must
            // not be set while the row is still unclaimed. Tolerant of partial
            // static updates where isClaimed isn't part of the changeset.
            isCoherentWithClaimed(value: Date | null) {
              if (value && this.isClaimed === false) {
                throw new Error(
                  "claimedAt: Cannot set claim date when isClaimed is false"
                );
              }
            },
          },
        },
        periodBucket: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        settlement: {
          type: DataTypes.ENUM("CLAIMABLE", "COMPOUNDED"),
          allowNull: true,
          validate: {
            isIn: {
              args: [["CLAIMABLE", "COMPOUNDED"]],
              msg: "settlement: Must be one of: CLAIMABLE, COMPOUNDED",
            },
          },
        },
        observationId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingEarningRecord",
        tableName: "staking_earning_records",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_earning_records_position_idx",
            fields: [{ name: "positionId" }],
          },
          {
            name: "staking_earning_records_type_idx",
            fields: [{ name: "type" }],
          },
          {
            name: "staking_earning_records_claimed_idx",
            fields: [{ name: "isClaimed" }],
          },
          {
            name: "staking_earning_records_position_claimed_idx",
            fields: [{ name: "positionId" }, { name: "isClaimed" }],
          },
          {
            name: "staking_earning_records_claimed_at_idx",
            fields: [{ name: "claimedAt" }],
          },
          {
            name: "staking_earning_records_observation_idx",
            fields: [{ name: "observationId" }],
          },
          {
            // Unique so an accrual period / distribution cycle credits a
            // position at most once. periodBucket is NULL for legacy rows and
            // MySQL treats NULLs as distinct, so they never collide.
            name: "staking_earning_records_period_idx",
            unique: true,
            fields: [{ name: "positionId" }, { name: "type" }, { name: "periodBucket" }],
          },
          {
            // periodBucket LEADS here on purpose. The unique index above starts
            // with positionId, so a lookup by cycle alone (the distribution
            // idempotency probe, and the admin earnings report's grouped
            // aggregate) cannot use it and scans the table. positionId trails
            // so those probes stay covered.
            name: "staking_earning_records_period_idx2",
            using: "BTREE",
            fields: [{ name: "periodBucket" }, { name: "positionId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingEarningRecord.belongsTo(models.stakingPosition, {
      foreignKey: "positionId",
      as: "position",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    stakingEarningRecord.belongsTo(models.stakingObservation, {
      foreignKey: "observationId",
      as: "observation",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
