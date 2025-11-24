import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class stakingPosition
  extends Model<stakingPositionAttributes, stakingPositionCreationAttributes>
  implements stakingPositionAttributes
{
  // Primary key
  id!: string;

  // Foreign keys
  userId!: string;
  poolId!: string;

  // Position details
  amount!: number;
  startDate!: Date;
  endDate!: Date;
  status!: "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING_WITHDRAWAL";

  // Withdrawal information
  withdrawalRequested!: boolean;
  withdrawalRequestDate!: Date | null;

  // Additional information
  adminNotes!: string | null;
  completedAt!: Date | null;

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
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "poolId: Pool ID cannot be null" },
            isUUID: { args: 4, msg: "poolId: Must be a valid UUID" },
          },
        },
        amount: {
          type: DataTypes.FLOAT,
          allowNull: false,
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
              if (new Date(value) >= new Date(this.endDate)) {
                throw new Error("startDate: Must be before end date");
              }
            },
          },
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: { msg: "endDate: Must be a valid date", args: true },
          },
        },
        status: {
          type: DataTypes.ENUM(
            "ACTIVE",
            "COMPLETED",
            "CANCELLED",
            "PENDING_WITHDRAWAL"
          ),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [
                ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
              ],
              msg: "status: Must be one of: ACTIVE, COMPLETED, CANCELLED, PENDING_WITHDRAWAL",
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
  }
}
