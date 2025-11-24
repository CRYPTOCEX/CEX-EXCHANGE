import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class stakingExternalPoolPerformance
  extends Model<
    stakingExternalPoolPerformanceAttributes,
    stakingExternalPoolPerformanceCreationAttributes
  >
  implements stakingExternalPoolPerformanceAttributes
{
  // Primary key
  id!: string;

  // Foreign key
  poolId!: string;

  // Performance details
  date!: Date;
  apr!: number;
  totalStaked!: number;
  profit!: number;
  notes!: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Model initialization
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof stakingExternalPoolPerformance {
    return stakingExternalPoolPerformance.init(
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
            isUUID: { args: 4, msg: "poolId: Must be a valid UUID" },
          },
        },
        date: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: { msg: "date: Must be a valid date", args: true },
            isNotFuture(value: Date) {
              if (new Date(value) > new Date()) {
                throw new Error("date: Cannot be in the future");
              }
            },
          },
        },
        apr: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isFloat: { msg: "apr: Must be a valid number" },
            min: { args: [0], msg: "apr: Cannot be negative" },
          },
        },
        totalStaked: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isFloat: { msg: "totalStaked: Must be a valid number" },
            min: { args: [0], msg: "totalStaked: Cannot be negative" },
          },
        },
        profit: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isFloat: { msg: "profit: Must be a valid number" },
          },
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "notes: Notes must not be empty" },
          },
        },
      },
      {
        sequelize,
        modelName: "stakingExternalPoolPerformance",
        tableName: "staking_external_pool_performances",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_external_pool_performances_pool_idx",
            fields: [{ name: "poolId" }],
          },
          {
            name: "staking_external_pool_performances_date_idx",
            fields: [{ name: "date" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingExternalPoolPerformance.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
