import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

export interface gasHistoryAttributes {
  id: string;
  chain: string;
  gasPrice: string;
  baseFee?: string | null;
  priorityFee?: string | null;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface gasHistoryCreationAttributes
  extends Optional<gasHistoryAttributes, "id" | "baseFee" | "priorityFee" | "createdAt" | "updatedAt"> {}

/**
 * Gas History - Stores historical gas prices for blockchain operations
 */
export default class gasHistory
  extends Model<gasHistoryAttributes, gasHistoryCreationAttributes>
  implements gasHistoryAttributes
{
  id!: string;
  chain!: string;
  gasPrice!: string;
  baseFee?: string | null;
  priorityFee?: string | null;
  timestamp!: Date;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof gasHistory {
    return gasHistory.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        gasPrice: {
          type: DataTypes.STRING(78), // BigInt string representation
          allowNull: false,
        },
        baseFee: {
          type: DataTypes.STRING(78),
          allowNull: true,
        },
        priorityFee: {
          type: DataTypes.STRING(78),
          allowNull: true,
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: "gasHistory",
        tableName: "gas_history",
        timestamps: true,
        indexes: [
          { fields: ["chain", "timestamp"] },
          { fields: ["timestamp"] },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // No associations
  }
}
