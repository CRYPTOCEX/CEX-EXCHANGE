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
  type!: "PLATFORM_FEE" | "EARLY_WITHDRAWAL_FEE" | "PERFORMANCE_FEE" | "OTHER";
  currency!: string;

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
          type: DataTypes.FLOAT,
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
            "OTHER"
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
                ],
              ],
              msg: "type: Must be one of: PLATFORM_FEE, EARLY_WITHDRAWAL_FEE, PERFORMANCE_FEE, OTHER",
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
