import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface tradingBotStatsAttributes {
  id: string;
  botId: string;
  userId: string;

  // Date (one record per day)
  date: string;

  // Trade Stats
  trades: number;
  winningTrades: number;
  losingTrades: number;

  // Financial
  profit: number;
  volume: number;
  fees: number;

  // Equity Tracking
  startEquity?: number;
  endEquity?: number;
  highEquity?: number;
  lowEquity?: number;

  // Paper vs Live
  isPaper: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface tradingBotStatsCreationAttributes
  extends Omit<
    tradingBotStatsAttributes,
    | "id"
    | "trades"
    | "winningTrades"
    | "losingTrades"
    | "profit"
    | "volume"
    | "fees"
    | "isPaper"
    | "createdAt"
    | "updatedAt"
  > {}

export default class tradingBotStats
  extends Model<tradingBotStatsAttributes, tradingBotStatsCreationAttributes>
  implements tradingBotStatsAttributes
{
  id!: string;
  botId!: string;
  userId!: string;
  date!: string;
  trades!: number;
  winningTrades!: number;
  losingTrades!: number;
  profit!: number;
  volume!: number;
  fees!: number;
  startEquity?: number;
  endEquity?: number;
  highEquity?: number;
  lowEquity?: number;
  isPaper!: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBotStats {
    return tradingBotStats.init(
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
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        trades: {
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
        profit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("profit");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        volume: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("volume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        fees: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("fees");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        startEquity: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("startEquity");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        endEquity: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("endEquity");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        highEquity: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("highEquity");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        lowEquity: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("lowEquity");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        isPaper: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        modelName: "tradingBotStats",
        tableName: "trading_bot_stats",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotStatsBotIdIdx",
            using: "BTREE",
            fields: [{ name: "botId" }],
          },
          {
            name: "tradingBotStatsUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "tradingBotStatsDateIdx",
            using: "BTREE",
            fields: [{ name: "date" }],
          },
          {
            name: "tradingBotStatsBotDateIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "botId" }, { name: "date" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    tradingBotStats.belongsTo(models.tradingBot, {
      as: "bot",
      foreignKey: "botId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotStats.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
