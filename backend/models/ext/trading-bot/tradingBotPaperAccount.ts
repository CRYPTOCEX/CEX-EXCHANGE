import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface tradingBotPaperAccountAttributes {
  id: string;
  userId: string;

  // Virtual Balance
  currency: string;
  balance: number;
  initialBalance: number;

  // Performance Tracking
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalVolume: number;
  highWaterMark: number;
  maxDrawdown: number;

  // Status
  isActive: boolean;

  // Reset tracking
  lastResetAt?: Date;
  resetCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface tradingBotPaperAccountCreationAttributes
  extends Omit<
    tradingBotPaperAccountAttributes,
    | "id"
    | "totalTrades"
    | "winningTrades"
    | "losingTrades"
    | "totalProfit"
    | "totalVolume"
    | "highWaterMark"
    | "maxDrawdown"
    | "isActive"
    | "resetCount"
    | "createdAt"
    | "updatedAt"
  > {}

export default class tradingBotPaperAccount
  extends Model<tradingBotPaperAccountAttributes, tradingBotPaperAccountCreationAttributes>
  implements tradingBotPaperAccountAttributes
{
  id!: string;
  userId!: string;
  currency!: string;
  balance!: number;
  initialBalance!: number;
  totalTrades!: number;
  winningTrades!: number;
  losingTrades!: number;
  totalProfit!: number;
  totalVolume!: number;
  highWaterMark!: number;
  maxDrawdown!: number;
  isActive!: boolean;
  lastResetAt?: Date;
  resetCount!: number;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBotPaperAccount {
    return tradingBotPaperAccount.init(
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
            notEmpty: { msg: "userId: User ID must not be empty" },
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "USDT",
        },
        balance: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("balance");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        initialBalance: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("initialBalance");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        winningTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        losingTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalProfit");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalVolume: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalVolume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        highWaterMark: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("highWaterMark");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        maxDrawdown: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("maxDrawdown");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        lastResetAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        resetCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: "tradingBotPaperAccount",
        tableName: "trading_bot_paper_account",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotPaperAccountUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "tradingBotPaperAccountUserCurrencyIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "currency" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    tradingBotPaperAccount.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
