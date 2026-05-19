import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Order status types
export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "PARTIAL"
  | "FILLED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";

// Order side
export type OrderSide = "BUY" | "SELL";

// Order type
export type OrderType = "LIMIT" | "STOP_LIMIT";

// Order purpose
export type OrderPurpose =
  | "ENTRY"
  | "EXIT"
  | "STOP_LOSS"
  | "TAKE_PROFIT"
  | "GRID_BUY"
  | "GRID_SELL"
  | "DCA";

export interface tradingBotOrderAttributes {
  id: string;
  botId: string;
  userId: string;
  tradeId?: string;
  ecosystemOrderId?: string;

  // Order Details
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;

  // Amounts
  amount: number;
  price: number;
  stopPrice?: number;
  filledAmount: number;
  remainingAmount: number;

  // Purpose
  purpose: OrderPurpose;

  // Grid-specific
  gridLevel?: number;

  // Paper Trading
  isPaper: boolean;

  // Expiry
  expiresAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface tradingBotOrderCreationAttributes
  extends Omit<
    tradingBotOrderAttributes,
    | "id"
    | "status"
    | "filledAmount"
    | "isPaper"
    | "createdAt"
    | "updatedAt"
  > {}

export default class tradingBotOrder
  extends Model<tradingBotOrderAttributes, tradingBotOrderCreationAttributes>
  implements tradingBotOrderAttributes
{
  id!: string;
  botId!: string;
  userId!: string;
  tradeId?: string;
  ecosystemOrderId?: string;
  symbol!: string;
  side!: OrderSide;
  type!: OrderType;
  status!: OrderStatus;
  amount!: number;
  price!: number;
  stopPrice?: number;
  filledAmount!: number;
  remainingAmount!: number;
  purpose!: OrderPurpose;
  gridLevel?: number;
  isPaper!: boolean;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBotOrder {
    return tradingBotOrder.init(
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
        tradeId: {
          type: DataTypes.UUID,
          allowNull: true,
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
          type: DataTypes.ENUM("LIMIT", "STOP_LIMIT"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["LIMIT", "STOP_LIMIT"]],
              msg: "type: Must be LIMIT or STOP_LIMIT",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "OPEN", "PARTIAL", "FILLED", "CANCELLED", "EXPIRED", "FAILED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "OPEN", "PARTIAL", "FILLED", "CANCELLED", "EXPIRED", "FAILED"]],
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
        stopPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("stopPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        filledAmount: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("filledAmount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        remainingAmount: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("remainingAmount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        purpose: {
          type: DataTypes.ENUM("ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT", "GRID_BUY", "GRID_SELL", "DCA"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT", "GRID_BUY", "GRID_SELL", "DCA"]],
              msg: "purpose: Must be a valid purpose",
            },
          },
        },
        gridLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        isPaper: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "tradingBotOrder",
        tableName: "trading_bot_order",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotOrderBotIdIdx",
            using: "BTREE",
            fields: [{ name: "botId" }],
          },
          {
            name: "tradingBotOrderUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "tradingBotOrderStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "tradingBotOrderSymbolStatusIdx",
            using: "BTREE",
            fields: [{ name: "symbol" }, { name: "status" }],
          },
          {
            name: "tradingBotOrderExpiresAtIdx",
            using: "BTREE",
            fields: [{ name: "expiresAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    tradingBotOrder.belongsTo(models.tradingBot, {
      as: "bot",
      foreignKey: "botId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotOrder.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotOrder.belongsTo(models.tradingBotTrade, {
      as: "trade",
      foreignKey: "tradeId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
