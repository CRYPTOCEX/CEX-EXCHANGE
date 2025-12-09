import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Bot personality types
export type AiBotPersonality =
  | "SCALPER"
  | "SWING"
  | "ACCUMULATOR"
  | "DISTRIBUTOR"
  | "MARKET_MAKER";

// Bot trade frequency
export type AiBotTradeFrequency = "HIGH" | "MEDIUM" | "LOW";

// Bot status
export type AiBotStatus = "ACTIVE" | "PAUSED" | "COOLDOWN";

export default class aiBot
  extends Model<aiBotAttributes, aiBotCreationAttributes>
  implements aiBotAttributes
{
  id!: string;
  marketMakerId!: string;
  name!: string;
  personality!: AiBotPersonality;
  riskTolerance!: number;
  tradeFrequency!: AiBotTradeFrequency;
  avgOrderSize!: number;
  orderSizeVariance!: number;
  preferredSpread!: number;
  status!: AiBotStatus;
  lastTradeAt?: Date;
  dailyTradeCount!: number;
  maxDailyTrades!: number;
  // Real performance tracking (only from real user trades, not AI-to-AI)
  realTradesExecuted!: number; // Total trades with real users
  profitableTrades!: number; // Trades where bot made profit
  totalRealizedPnL!: number; // Total realized P&L from real trades
  totalVolume!: number; // Total volume traded with real users
  currentPosition!: number; // Current position size (positive = long, negative = short)
  avgEntryPrice!: number; // Average entry price for current position
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof aiBot {
    return aiBot.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        marketMakerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "marketMakerId: Market Maker ID must not be empty" },
            isUUID: { args: 4, msg: "marketMakerId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Bot name must not be empty" },
            len: {
              args: [1, 100],
              msg: "name: Bot name must be between 1 and 100 characters",
            },
          },
        },
        personality: {
          type: DataTypes.ENUM(
            "SCALPER",
            "SWING",
            "ACCUMULATOR",
            "DISTRIBUTOR",
            "MARKET_MAKER"
          ),
          allowNull: false,
          defaultValue: "SCALPER",
          validate: {
            isIn: {
              args: [["SCALPER", "SWING", "ACCUMULATOR", "DISTRIBUTOR", "MARKET_MAKER"]],
              msg: "personality: Must be a valid bot personality type",
            },
          },
        },
        riskTolerance: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: false,
          defaultValue: 0.5,
          validate: {
            isDecimal: { msg: "riskTolerance: Must be a valid decimal number" },
            min: { args: [0.1], msg: "riskTolerance: Must be at least 0.1" },
            max: { args: [1.0], msg: "riskTolerance: Must be at most 1.0" },
          },
          get() {
            const value = this.getDataValue("riskTolerance");
            return value ? parseFloat(value.toString()) : 0.5;
          },
        },
        tradeFrequency: {
          type: DataTypes.ENUM("HIGH", "MEDIUM", "LOW"),
          allowNull: false,
          defaultValue: "MEDIUM",
          validate: {
            isIn: {
              args: [["HIGH", "MEDIUM", "LOW"]],
              msg: "tradeFrequency: Must be HIGH, MEDIUM, or LOW",
            },
          },
        },
        avgOrderSize: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "avgOrderSize: Must be a valid decimal number" },
            min: { args: [0], msg: "avgOrderSize: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("avgOrderSize");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        orderSizeVariance: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: false,
          defaultValue: 0.2,
          validate: {
            isDecimal: { msg: "orderSizeVariance: Must be a valid decimal number" },
            min: { args: [0.1], msg: "orderSizeVariance: Must be at least 0.1 (10%)" },
            max: { args: [0.5], msg: "orderSizeVariance: Must be at most 0.5 (50%)" },
          },
          get() {
            const value = this.getDataValue("orderSizeVariance");
            return value ? parseFloat(value.toString()) : 0.2;
          },
        },
        preferredSpread: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.001,
          validate: {
            isDecimal: { msg: "preferredSpread: Must be a valid decimal number" },
            min: { args: [0.0001], msg: "preferredSpread: Must be at least 0.0001 (0.01%)" },
            max: { args: [0.1], msg: "preferredSpread: Must be at most 0.1 (10%)" },
          },
          get() {
            const value = this.getDataValue("preferredSpread");
            return value ? parseFloat(value.toString()) : 0.001;
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "PAUSED", "COOLDOWN"),
          allowNull: false,
          defaultValue: "PAUSED",
          validate: {
            isIn: {
              args: [["ACTIVE", "PAUSED", "COOLDOWN"]],
              msg: "status: Must be ACTIVE, PAUSED, or COOLDOWN",
            },
          },
        },
        lastTradeAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        dailyTradeCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "dailyTradeCount: Must be an integer" },
            min: { args: [0], msg: "dailyTradeCount: Must be greater than or equal to 0" },
          },
        },
        maxDailyTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
          validate: {
            isInt: { msg: "maxDailyTrades: Must be an integer" },
            min: { args: [1], msg: "maxDailyTrades: Must be at least 1" },
          },
        },
        // Real performance tracking (only from real user trades, not AI-to-AI)
        realTradesExecuted: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "realTradesExecuted: Must be an integer" },
            min: { args: [0], msg: "realTradesExecuted: Must be >= 0" },
          },
        },
        profitableTrades: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "profitableTrades: Must be an integer" },
            min: { args: [0], msg: "profitableTrades: Must be >= 0" },
          },
        },
        totalRealizedPnL: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalRealizedPnL");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalVolume: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalVolume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        currentPosition: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("currentPosition");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        avgEntryPrice: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("avgEntryPrice");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
      },
      {
        sequelize,
        modelName: "aiBot",
        tableName: "ai_bot",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "aiBotMarketMakerIdIdx",
            using: "BTREE",
            fields: [{ name: "marketMakerId" }],
          },
          {
            name: "aiBotStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "aiBotPersonalityIdx",
            using: "BTREE",
            fields: [{ name: "personality" }],
          },
          // Composite index for querying bots by market maker and status
          {
            name: "aiBotMarketMakerStatusIdx",
            using: "BTREE",
            fields: [{ name: "marketMakerId" }, { name: "status" }],
          },
          // Index for P&L queries (e.g., top performing bots)
          {
            name: "aiBotPnLIdx",
            using: "BTREE",
            fields: [{ name: "totalRealizedPnL" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Belongs to market maker
    aiBot.belongsTo(models.aiMarketMaker, {
      as: "marketMaker",
      foreignKey: "marketMakerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
