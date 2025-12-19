import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import aiMarketMakerPool from "./aiMarketMakerPool";
import aiBot from "./aiBot";
import aiMarketMakerHistory from "./aiMarketMakerHistory";
import { logger } from "@b/utils/console";

/**
 * Status of an AI Market Maker
 * - ACTIVE: Trading engine is running and executing trades
 * - PAUSED: Temporarily stopped, can be resumed
 * - STOPPED: Fully stopped, requires start to resume
 */
export type AiMarketMakerStatus = "ACTIVE" | "PAUSED" | "STOPPED";

/**
 * Trading aggression level
 * - CONSERVATIVE: Slower trades, tighter spreads, minimal market impact
 * - MODERATE: Balanced approach
 * - AGGRESSIVE: Faster trades, wider spreads, more market presence
 */
export type AiMarketMakerAggressionLevel =
  | "CONSERVATIVE"
  | "MODERATE"
  | "AGGRESSIVE";

/**
 * AI Market Maker - Core model for automated market making configuration
 *
 * This model manages automated trading bots that simulate market activity
 * and maintain liquidity for ecosystem trading pairs.
 *
 * Business Rules:
 * - One market maker per ecosystem market (unique marketId constraint)
 * - targetPrice must always be between priceRangeLow and priceRangeHigh
 * - currentDailyVolume resets to 0 at midnight via scheduled cron job
 * - realLiquidityPercent determines % of orders placed in real ecosystem orderbook
 *   (0 = AI-only simulation mode, 100 = all orders go to real orderbook)
 *
 * Related Models:
 * - aiMarketMakerPool (1:1) - Liquidity pool balances and P&L tracking
 * - aiBot (1:N) - Individual trading bot configurations with personalities
 * - aiMarketMakerHistory (1:N) - Immutable audit log of all actions
 * - ecosystemMarket (N:1) - The trading pair being managed
 *
 * @example
 * // Create a new market maker
 * const maker = await aiMarketMaker.create({
 *   marketId: ecosystemMarket.id,
 *   targetPrice: 1.5,
 *   priceRangeLow: 1.0,
 *   priceRangeHigh: 2.0,
 *   aggressionLevel: "MODERATE",
 *   maxDailyVolume: 10000,
 * });
 */
export default class aiMarketMaker
  extends Model<aiMarketMakerAttributes, aiMarketMakerCreationAttributes>
  implements aiMarketMakerAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the ecosystem market being managed */
  marketId!: string;
  /** Current operational status */
  status!: AiMarketMakerStatus;
  /** Target price the market maker is steering towards */
  targetPrice!: number;
  /** Minimum price boundary for trading operations */
  priceRangeLow!: number;
  /** Maximum price boundary for trading operations */
  priceRangeHigh!: number;
  /** How aggressively the bots trade */
  aggressionLevel!: AiMarketMakerAggressionLevel;
  /** Maximum trading volume allowed per day (resets at midnight) */
  maxDailyVolume!: number;
  /** Current accumulated volume for today */
  currentDailyVolume!: number;
  /** Volatility percentage threshold that triggers auto-pause (0-100) */
  volatilityThreshold!: number;
  /** Whether to automatically pause when volatility exceeds threshold */
  pauseOnHighVolatility!: boolean;
  /** Percentage of orders to place in real ecosystem orderbook (0-100) */
  realLiquidityPercent!: number;
  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  pool?: aiMarketMakerPool;
  bots?: aiBot[];
  history?: aiMarketMakerHistory[];

  // Association methods
  getPool!: Sequelize.HasOneGetAssociationMixin<aiMarketMakerPool>;
  createPool!: Sequelize.HasOneCreateAssociationMixin<aiMarketMakerPool>;

  getBots!: Sequelize.HasManyGetAssociationsMixin<aiBot>;
  addBot!: Sequelize.HasManyAddAssociationMixin<aiBot, string>;
  createBot!: Sequelize.HasManyCreateAssociationMixin<aiBot>;
  countBots!: Sequelize.HasManyCountAssociationsMixin;

  getHistory!: Sequelize.HasManyGetAssociationsMixin<aiMarketMakerHistory>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof aiMarketMaker {
    return aiMarketMaker.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        marketId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: { msg: "marketId: Market ID must not be empty" },
            isUUID: { args: 4, msg: "marketId: Must be a valid UUID" },
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "PAUSED", "STOPPED"),
          allowNull: false,
          defaultValue: "STOPPED",
          validate: {
            isIn: {
              args: [["ACTIVE", "PAUSED", "STOPPED"]],
              msg: "status: Must be ACTIVE, PAUSED, or STOPPED",
            },
          },
        },
        targetPrice: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "targetPrice: Must be a valid decimal number" },
            min: { args: [0], msg: "targetPrice: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("targetPrice");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        priceRangeLow: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "priceRangeLow: Must be a valid decimal number" },
            min: { args: [0], msg: "priceRangeLow: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("priceRangeLow");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        priceRangeHigh: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "priceRangeHigh: Must be a valid decimal number" },
            min: { args: [0], msg: "priceRangeHigh: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("priceRangeHigh");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        aggressionLevel: {
          type: DataTypes.ENUM("CONSERVATIVE", "MODERATE", "AGGRESSIVE"),
          allowNull: false,
          defaultValue: "CONSERVATIVE",
          validate: {
            isIn: {
              args: [["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]],
              msg: "aggressionLevel: Must be CONSERVATIVE, MODERATE, or AGGRESSIVE",
            },
          },
        },
        maxDailyVolume: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "maxDailyVolume: Must be a valid decimal number" },
            min: { args: [0], msg: "maxDailyVolume: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("maxDailyVolume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        currentDailyVolume: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: "currentDailyVolume: Must be a valid decimal number" },
            min: { args: [0], msg: "currentDailyVolume: Must be greater than or equal to 0" },
          },
          get() {
            const value = this.getDataValue("currentDailyVolume");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        volatilityThreshold: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 5.0,
          validate: {
            isDecimal: { msg: "volatilityThreshold: Must be a valid decimal number" },
            min: { args: [0], msg: "volatilityThreshold: Must be greater than or equal to 0" },
            max: { args: [100], msg: "volatilityThreshold: Must be less than or equal to 100" },
          },
          get() {
            const value = this.getDataValue("volatilityThreshold");
            return value ? parseFloat(value.toString()) : 5.0;
          },
        },
        pauseOnHighVolatility: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        realLiquidityPercent: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0, // 0 = AI-only mode (safest), 100 = all real orders
          validate: {
            isDecimal: { msg: "realLiquidityPercent: Must be a valid decimal number" },
            min: { args: [0], msg: "realLiquidityPercent: Must be at least 0" },
            max: { args: [100], msg: "realLiquidityPercent: Must be at most 100" },
          },
          get() {
            const value = this.getDataValue("realLiquidityPercent");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
      },
      {
        sequelize,
        modelName: "aiMarketMaker",
        tableName: "ai_market_maker",
        timestamps: true,
        hooks: {
          // Cross-field validation: ensure price range is valid
          beforeValidate: (instance: aiMarketMaker) => {
            const low = Number(instance.priceRangeLow) || 0;
            const high = Number(instance.priceRangeHigh) || 0;
            const target = Number(instance.targetPrice) || 0;

            // Only validate if values are set (non-zero)
            if (low > 0 && high > 0 && low >= high) {
              throw new Error("priceRangeLow must be less than priceRangeHigh");
            }

            if (target > 0 && low > 0 && target < low) {
              throw new Error("targetPrice must be greater than or equal to priceRangeLow");
            }

            if (target > 0 && high > 0 && target > high) {
              throw new Error("targetPrice must be less than or equal to priceRangeHigh");
            }
          },
          // Ensure currentDailyVolume doesn't exceed maxDailyVolume
          beforeSave: (instance: aiMarketMaker) => {
            const current = Number(instance.currentDailyVolume) || 0;
            const max = Number(instance.maxDailyVolume) || 0;

            if (max > 0 && current > max) {
              logger.warn("AI_MM", `currentDailyVolume (${current}) exceeds maxDailyVolume (${max})`);
            }
          },
        },
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "aiMarketMakerMarketIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "marketId" }],
          },
          {
            name: "aiMarketMakerStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // One-to-one with pool
    aiMarketMaker.hasOne(models.aiMarketMakerPool, {
      as: "pool",
      foreignKey: "marketMakerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // One-to-many with bots
    aiMarketMaker.hasMany(models.aiBot, {
      as: "bots",
      foreignKey: "marketMakerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // One-to-many with history
    aiMarketMaker.hasMany(models.aiMarketMakerHistory, {
      as: "history",
      foreignKey: "marketMakerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Belongs to ecosystem market
    aiMarketMaker.belongsTo(models.ecosystemMarket, {
      as: "market",
      foreignKey: "marketId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
