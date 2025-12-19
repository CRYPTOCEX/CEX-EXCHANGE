import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Type definitions
export type TransactionType =
  | "ALLOCATION"
  | "DEALLOCATION"
  | "PROFIT_SHARE"
  | "TRADE_PROFIT"
  | "TRADE_LOSS"
  | "FEE"
  | "REFUND";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface copyTradingTransactionAttributes {
  id: string;
  userId: string;
  leaderId?: string;
  followerId?: string;
  tradeId?: string;

  // Transaction Details
  type: TransactionType;
  amount: number;
  currency: string;
  fee: number;

  // Balances
  balanceBefore: number;
  balanceAfter: number;

  // Status
  status: TransactionStatus;
  description?: string;
  metadata?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface copyTradingTransactionCreationAttributes
  extends Omit<copyTradingTransactionAttributes, "id" | "createdAt" | "updatedAt"> {}

export default class copyTradingTransaction
  extends Model<
    copyTradingTransactionAttributes,
    copyTradingTransactionCreationAttributes
  >
  implements copyTradingTransactionAttributes
{
  id!: string;
  userId!: string;
  leaderId?: string;
  followerId?: string;
  tradeId?: string;

  type!: TransactionType;
  amount!: number;
  currency!: string;
  fee!: number;

  balanceBefore!: number;
  balanceAfter!: number;

  status!: TransactionStatus;
  description?: string;
  metadata?: string;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingTransaction {
    return copyTradingTransaction.init(
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
            notNull: { msg: "userId: User ID is required" },
          },
        },
        leaderId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        followerId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        tradeId: {
          type: DataTypes.UUID,
          allowNull: true,
        },

        // Transaction Details
        type: {
          type: DataTypes.ENUM(
            "ALLOCATION",
            "DEALLOCATION",
            "PROFIT_SHARE",
            "TRADE_PROFIT",
            "TRADE_LOSS",
            "FEE",
            "REFUND"
          ),
          allowNull: false,
        },
        amount: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "USDT",
        },
        fee: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },

        // Balances
        balanceBefore: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        balanceAfter: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },

        // Status
        status: {
          type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED"),
          allowNull: false,
          defaultValue: "COMPLETED",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        // Timestamps
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "copyTradingTransaction",
        tableName: "copy_trading_transactions",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "copy_trading_transactions_user_id_idx",
            fields: [{ name: "userId" }],
          },
          {
            name: "copy_trading_transactions_leader_id_idx",
            fields: [{ name: "leaderId" }],
          },
          {
            name: "copy_trading_transactions_follower_id_idx",
            fields: [{ name: "followerId" }],
          },
          {
            name: "copy_trading_transactions_trade_id_idx",
            fields: [{ name: "tradeId" }],
          },
          {
            name: "copy_trading_transactions_type_idx",
            fields: [{ name: "type" }],
          },
          {
            name: "copy_trading_transactions_status_idx",
            fields: [{ name: "status" }],
          },
          {
            name: "copy_trading_transactions_created_at_idx",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingTransaction.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingTransaction.belongsTo(models.copyTradingLeader, {
      foreignKey: "leaderId",
      as: "leader",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    copyTradingTransaction.belongsTo(models.copyTradingFollower, {
      foreignKey: "followerId",
      as: "follower",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    copyTradingTransaction.belongsTo(models.copyTradingTrade, {
      foreignKey: "tradeId",
      as: "trade",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
