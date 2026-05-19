import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Type definitions
export type TradeStatus =
  | "PENDING"
  | "PENDING_REPLICATION"
  | "REPLICATED"
  | "REPLICATION_FAILED"
  | "OPEN"
  | "CLOSED"
  | "PARTIALLY_FILLED"
  | "FAILED"
  | "CANCELLED";
export type TradeSide = "BUY" | "SELL";
export type TradeType = "MARKET" | "LIMIT";

export interface copyTradingTradeAttributes {
  id: string;
  leaderId: string;
  followerId?: string;
  leaderOrderId?: string;

  // Trade Details
  symbol: string;
  side: TradeSide;
  type: TradeType;
  amount: number;
  price: number;
  cost: number;
  fee: number;
  feeCurrency: string;

  // Execution
  executedAmount: number;
  executedPrice: number;
  slippage?: number;
  latencyMs?: number;

  // P&L (for closed trades)
  profit?: number;
  profitPercent?: number;
  profitCurrency?: string; // Currency the profit is denominated in (quote currency)

  // Status
  status: TradeStatus;
  errorMessage?: string;

  // Metadata
  isLeaderTrade: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export interface copyTradingTradeCreationAttributes
  extends Omit<
    copyTradingTradeAttributes,
    "id" | "createdAt" | "updatedAt" | "closedAt" | "executedAmount" | "executedPrice"
  > {}

export default class copyTradingTrade
  extends Model<copyTradingTradeAttributes, copyTradingTradeCreationAttributes>
  implements copyTradingTradeAttributes
{
  id!: string;
  leaderId!: string;
  followerId?: string;
  leaderOrderId?: string;

  symbol!: string;
  side!: TradeSide;
  type!: TradeType;
  amount!: number;
  price!: number;
  cost!: number;
  fee!: number;
  feeCurrency!: string;

  executedAmount!: number;
  executedPrice!: number;
  slippage?: number;
  latencyMs?: number;

  profit?: number;
  profitPercent?: number;
  profitCurrency?: string;

  status!: TradeStatus;
  errorMessage?: string;

  isLeaderTrade!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
  closedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingTrade {
    return copyTradingTrade.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        leaderId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "leaderId: Leader ID is required" },
          },
        },
        followerId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        leaderOrderId: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },

        // Trade Details
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol is required" },
          },
        },
        side: {
          type: DataTypes.ENUM("BUY", "SELL"),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("MARKET", "LIMIT"),
          allowNull: false,
          defaultValue: "MARKET",
        },
        amount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            min: { args: [0], msg: "amount: Cannot be negative" },
          },
        },
        price: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            min: { args: [0], msg: "price: Cannot be negative" },
          },
        },
        cost: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        fee: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        feeCurrency: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "USDT",
        },

        // Execution
        executedAmount: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        executedPrice: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        slippage: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        latencyMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },

        // P&L
        profit: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        profitPercent: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        profitCurrency: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },

        // Status
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "PENDING_REPLICATION",
            "REPLICATED",
            "REPLICATION_FAILED",
            "OPEN",
            "CLOSED",
            "PARTIALLY_FILLED",
            "FAILED",
            "CANCELLED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        // Metadata
        isLeaderTrade: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
        closedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "copyTradingTrade",
        tableName: "copy_trading_trades",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "copy_trading_trades_leader_id_idx",
            fields: [{ name: "leaderId" }],
          },
          {
            name: "copy_trading_trades_follower_id_idx",
            fields: [{ name: "followerId" }],
          },
          {
            name: "copy_trading_trades_leader_order_id_idx",
            fields: [{ name: "leaderOrderId" }],
          },
          {
            name: "copy_trading_trades_symbol_idx",
            fields: [{ name: "symbol" }],
          },
          {
            name: "copy_trading_trades_status_idx",
            fields: [{ name: "status" }],
          },
          {
            name: "copy_trading_trades_created_at_idx",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingTrade.belongsTo(models.copyTradingLeader, {
      foreignKey: "leaderId",
      as: "leader",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    copyTradingTrade.belongsTo(models.copyTradingFollower, {
      foreignKey: "followerId",
      as: "follower",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
