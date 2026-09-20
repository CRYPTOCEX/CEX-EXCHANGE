import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class stakingAdminEarning
  extends Model<
    stakingAdminEarningAttributes,
    stakingAdminEarningCreationAttributes
  >
  implements stakingAdminEarningAttributes
{
  // Primary key
  id!: string;

  // Foreign key
  poolId!: string;

  // Earning details
  amount!: number;
  isClaimed!: boolean;
  type!:
    | "PLATFORM_FEE"
    | "EARLY_WITHDRAWAL_FEE"
    | "PERFORMANCE_FEE"
    | "OTHER"
    | "STAKING_COMMISSION";
  currency!: string;

  // Distribution-cycle de-duplication key (mirrors stakingEarningRecord) so a
  // pool's platform fee is booked at most once per (engine, cycle).
  periodBucket!: string | null;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Model initialization
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof stakingAdminEarning {
    return stakingAdminEarning.init(
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
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount: Must be a valid number" },
            min: { args: [0], msg: "amount: Cannot be negative" },
          },
        },
        isClaimed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        type: {
          type: DataTypes.ENUM(
            "PLATFORM_FEE",
            "EARLY_WITHDRAWAL_FEE",
            "PERFORMANCE_FEE",
            "OTHER",
            // The on-chain product's take: commission on OBSERVED rewards,
            // held as treasury shares until an explicit COMMISSION_EXIT walks
            // the same unstake path and the coins actually land.
            "STAKING_COMMISSION"
          ),
          allowNull: false,
          validate: {
            notEmpty: { msg: "type: Type must not be empty" },
            isIn: {
              args: [
                [
                  "PLATFORM_FEE",
                  "EARLY_WITHDRAWAL_FEE",
                  "PERFORMANCE_FEE",
                  "OTHER",
                  "STAKING_COMMISSION",
                ],
              ],
              msg: "type: Must be one of: PLATFORM_FEE, EARLY_WITHDRAWAL_FEE, PERFORMANCE_FEE, OTHER, STAKING_COMMISSION",
            },
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
        },
        periodBucket: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingAdminEarning",
        tableName: "staking_admin_earnings",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_admin_earnings_pool_idx",
            fields: [{ name: "poolId" }],
          },
          {
            name: "staking_admin_earnings_claimed_idx",
            fields: [{ name: "isClaimed" }],
          },
          {
            // Unique so a pool's fee for a given distribution event is booked
            // at most once. periodBucket is NULL for ad-hoc/legacy rows and
            // MySQL treats NULLs as distinct, so they never collide.
            name: "staking_admin_earnings_period_idx",
            unique: true,
            fields: [{ name: "poolId" }, { name: "type" }, { name: "periodBucket" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingAdminEarning.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
