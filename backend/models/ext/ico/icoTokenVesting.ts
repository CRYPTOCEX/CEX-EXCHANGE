import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

interface icoTokenVestingAttributes {
  id: string;
  transactionId: string;
  userId: string;
  offeringId: string;
  totalAmount: number;
  releasedAmount: number;
  vestingType: "LINEAR" | "CLIFF" | "MILESTONE";
  startDate: Date;
  endDate: Date;
  cliffDuration?: number;
  releaseSchedule?: any;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

interface icoTokenVestingCreationAttributes extends Omit<icoTokenVestingAttributes, 'id' | 'releasedAmount' | 'status'> {}

export default class icoTokenVesting
  extends Model<icoTokenVestingAttributes, icoTokenVestingCreationAttributes>
  implements icoTokenVestingAttributes
{
  public id!: string;
  public transactionId!: string;
  public userId!: string;
  public offeringId!: string;
  public totalAmount!: number;
  public releasedAmount!: number;
  public vestingType!: "LINEAR" | "CLIFF" | "MILESTONE";
  public startDate!: Date;
  public endDate!: Date;
  public cliffDuration?: number;
  public releaseSchedule?: any;
  public status!: "ACTIVE" | "COMPLETED" | "CANCELLED";
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof icoTokenVesting {
    return icoTokenVesting.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        transactionId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "ico_transaction",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "user",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        offeringId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "ico_token_offering",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        totalAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        releasedAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        vestingType: {
          type: DataTypes.ENUM("LINEAR", "CLIFF", "MILESTONE"),
          allowNull: false,
          defaultValue: "LINEAR",
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        cliffDuration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Cliff duration in days",
        },
        releaseSchedule: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "JSON array of milestone releases [{date, percentage, amount}]",
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
      },
      {
        sequelize,
        modelName: "icoTokenVesting",
        tableName: "ico_token_vesting",
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ["transactionId"] },
          { fields: ["userId"] },
          { fields: ["offeringId"] },
          { fields: ["status"] },
          { fields: ["startDate", "endDate"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Add associations here if needed
  }
}