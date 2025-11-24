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
  description!: string;
  isClaimed!: boolean;
  claimedAt!: Date | null;

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
          type: DataTypes.FLOAT,
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
  }
}
