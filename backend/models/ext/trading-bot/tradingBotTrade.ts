import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Trade status types
export type TradeStatus =
  | "PENDING"
  | "OPEN"
  | "CLOSED"
  | "CANCELLED"
  | "FAILED";

// Trade side
export type TradeSide = "BUY" | "SELL";

// Trade type
export type TradeType = "MARKET" | "LIMIT";

export interface tradingBotTradeAttributes {
  id: string;
  botId: string;
  userId: string;
  ecosystemOrderId?: string;

  // Trade Info
  symbol: string;
  side: TradeSide;
  type: TradeType;
  status: TradeStatus;

  // Amounts
  amount: number;
  price: number;
  cost: number;
  fee: number;
  feeCurrency?: string;

  // Execution
  executedAmount?: number;
  executedPrice?: number;
  executedCost?: number;

  // P&L (for closed trades)
  entryPrice?: number;
  exitPrice?: number;
  profit?: number;
  profitPercent?: number;

  // Risk Management Applied
  stopLossPrice?: number;
  takeProfitPrice?: number;
  stopLossTriggered: boolean;
  takeProfitTriggered: boolean;

  // Strategy Context
  strategySignal?: string;
  strategyContext?: Record<string, any>;

  // Paper Trading
  isPaper: boolean;

  // Timing
  openedAt?: Date;
  closedAt?: Date;

  // Error Handling
  errorMessage?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface tradingBotTradeCreationAttributes
  extends Omit<
    tradingBotTradeAttributes,
    | "id"
    | "status"
    | "fee"
    | "stopLossTriggered"
    | "takeProfitTriggered"
    | "isPaper"
    | "createdAt"
    | "updatedAt"
  > {}

export default class tradingBotTrade
  extends Model<tradingBotTradeAttributes, tradingBotTradeCreationAttributes>
  implements tradingBotTradeAttributes
{
  id!: string;
  botId!: string;
  userId!: string;
  ecosystemOrderId?: string;
  symbol!: string;
  side!: TradeSide;
  type!: TradeType;
  status!: TradeStatus;
  amount!: number;
  price!: number;
  cost!: number;
  fee!: number;
  feeCurrency?: string;
  executedAmount?: number;
  executedPrice?: number;
  executedCost?: number;
  entryPrice?: number;
  exitPrice?: number;
  profit?: number;
  profitPercent?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  stopLossTriggered!: boolean;
  takeProfitTriggered!: boolean;
  strategySignal?: string;
  strategyContext?: Record<string, any>;
  isPaper!: boolean;
  openedAt?: Date;
  closedAt?: Date;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBotTrade {
    return tradingBotTrade.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        botId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "botId: Bot ID must not be empty" },
            isUUID: { args: 4, msg: "botId: Must be a valid UUID" },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "userId: User ID must not be empty" },
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        ecosystemOrderId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
        },
        side: {
          type: DataTypes.ENUM("BUY", "SELL"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["BUY", "SELL"]],
              msg: "side: Must be BUY or SELL",
            },
          },
        },
        type: {
          type: DataTypes.ENUM("MARKET", "LIMIT"),
          allowNull: false,
          defaultValue: "MARKET",
          validate: {
            isIn: {
              args: [["MARKET", "LIMIT"]],
              msg: "type: Must be MARKET or LIMIT",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "OPEN", "CLOSED", "CANCELLED", "FAILED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "OPEN", "CLOSED", "CANCELLED", "FAILED"]],
              msg: "status: Must be a valid status",
            },
          },
        },
        amount: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("amount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        price: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("price");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        cost: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("cost");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        fee: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("fee");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        feeCurrency: {
          type: DataTypes.STRING(10),
          allowNull: true,
        },
        executedAmount: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("executedAmount");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        executedPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("executedPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        executedCost: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("executedCost");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        entryPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("entryPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        exitPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("exitPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        profit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("profit");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        profitPercent: {
          type: DataTypes.DECIMAL(8, 4),
          allowNull: true,
          get() {
            const value = this.getDataValue("profitPercent");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        stopLossPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("stopLossPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        takeProfitPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("takeProfitPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        stopLossTriggered: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        takeProfitTriggered: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        strategySignal: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        strategyContext: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        isPaper: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        openedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        closedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "tradingBotTrade",
        tableName: "trading_bot_trade",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotTradeBotIdIdx",
            using: "BTREE",
            fields: [{ name: "botId" }],
          },
          {
            name: "tradingBotTradeUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "tradingBotTradeStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "tradingBotTradeSymbolIdx",
            using: "BTREE",
            fields: [{ name: "symbol" }],
          },
          {
            name: "tradingBotTradeIsPaperIdx",
            using: "BTREE",
            fields: [{ name: "isPaper" }],
          },
          {
            name: "tradingBotTradeBotStatusIdx",
            using: "BTREE",
            fields: [{ name: "botId" }, { name: "status" }],
          },
          {
            name: "tradingBotTradeUserPaperIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "isPaper" }],
          },
          {
            name: "tradingBotTradeCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    tradingBotTrade.belongsTo(models.tradingBot, {
      as: "bot",
      foreignKey: "botId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotTrade.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
