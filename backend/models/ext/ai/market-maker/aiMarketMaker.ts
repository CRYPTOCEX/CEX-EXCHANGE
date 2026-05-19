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
 * Price mode for market maker
 * - AUTONOMOUS: Fully autonomous price discovery with phases
 * - FOLLOW_EXTERNAL: Follow external exchange price closely
 * - HYBRID: Mix of external influence and autonomous movement
 */
export type AiMarketMakerPriceMode =
  | "AUTONOMOUS"
  | "FOLLOW_EXTERNAL"
  | "HYBRID";

/**
 * Admin bias guidance
 * - BULLISH: Favors upward price movements
 * - BEARISH: Favors downward price movements
 * - NEUTRAL: No directional bias
 */
export type AiMarketMakerBias = "BULLISH" | "BEARISH" | "NEUTRAL";

/**
 * Market phase (Wyckoff-style)
 * - ACCUMULATION: Building base, consolidation
 * - MARKUP: Bull run, higher highs
 * - DISTRIBUTION: Topping pattern, choppy
 * - MARKDOWN: Bear market, lower lows
 */
export type AiMarketMakerPhase =
  | "ACCUMULATION"
  | "MARKUP"
  | "DISTRIBUTION"
  | "MARKDOWN";

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

  // ============================================
  // Multi-Timeframe Volatility System Fields
  // ============================================

  /** Price mode: AUTONOMOUS, FOLLOW_EXTERNAL, or HYBRID */
  priceMode!: AiMarketMakerPriceMode;
  /** External symbol to track (e.g., "BTC/USDT") when following external price */
  externalSymbol!: string | null;
  /** How closely to follow external price (0-100%) */
  correlationStrength!: number;

  /** Admin bias guidance: BULLISH, BEARISH, or NEUTRAL */
  marketBias!: AiMarketMakerBias;
  /** How strongly bias affects phase transitions (0-100%) */
  biasStrength!: number;

  /** Current market phase: ACCUMULATION, MARKUP, DISTRIBUTION, MARKDOWN */
  currentPhase!: AiMarketMakerPhase;
  /** When the current phase started */
  phaseStartedAt!: Date | null;
  /** When the next phase transition is scheduled */
  nextPhaseChangeAt!: Date | null;
  /** Target price for end of current phase */
  phaseTargetPrice!: number | null;

  /** Base daily volatility percentage (e.g., 2.0 for 2%) */
  baseVolatility!: number;
  /** Multiplier for current phase volatility (0.5-2.0) */
  volatilityMultiplier!: number;
  /** How quickly momentum decays per tick (0.8-0.99) */
  momentumDecay!: number;

  /** Last known price for smooth restarts */
  lastKnownPrice!: number | null;
  /** Current trend momentum (-1.0 to 1.0) */
  trendMomentum!: number;
  /** When momentum was last updated */
  lastMomentumUpdate!: Date | null;

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

        // ============================================
        // Multi-Timeframe Volatility System Fields
        // ============================================

        // Price Mode Configuration
        priceMode: {
          type: DataTypes.ENUM("AUTONOMOUS", "FOLLOW_EXTERNAL", "HYBRID"),
          allowNull: false,
          defaultValue: "AUTONOMOUS",
          validate: {
            isIn: {
              args: [["AUTONOMOUS", "FOLLOW_EXTERNAL", "HYBRID"]],
              msg: "priceMode: Must be AUTONOMOUS, FOLLOW_EXTERNAL, or HYBRID",
            },
          },
        },
        externalSymbol: {
          type: DataTypes.STRING(20),
          allowNull: true,
          defaultValue: null,
          comment: "External symbol to track (e.g., BTC/USDT) when in FOLLOW or HYBRID mode",
        },
        correlationStrength: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 50,
          validate: {
            isDecimal: { msg: "correlationStrength: Must be a valid decimal number" },
            min: { args: [0], msg: "correlationStrength: Must be at least 0" },
            max: { args: [100], msg: "correlationStrength: Must be at most 100" },
          },
          get() {
            const value = this.getDataValue("correlationStrength");
            return value ? parseFloat(value.toString()) : 50;
          },
        },

        // Admin Bias Configuration
        marketBias: {
          type: DataTypes.ENUM("BULLISH", "BEARISH", "NEUTRAL"),
          allowNull: false,
          defaultValue: "NEUTRAL",
          validate: {
            isIn: {
              args: [["BULLISH", "BEARISH", "NEUTRAL"]],
              msg: "marketBias: Must be BULLISH, BEARISH, or NEUTRAL",
            },
          },
        },
        biasStrength: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 50,
          validate: {
            isDecimal: { msg: "biasStrength: Must be a valid decimal number" },
            min: { args: [0], msg: "biasStrength: Must be at least 0" },
            max: { args: [100], msg: "biasStrength: Must be at most 100" },
          },
          get() {
            const value = this.getDataValue("biasStrength");
            return value ? parseFloat(value.toString()) : 50;
          },
        },

        // Phase State (persists across restarts)
        currentPhase: {
          type: DataTypes.ENUM("ACCUMULATION", "MARKUP", "DISTRIBUTION", "MARKDOWN"),
          allowNull: false,
          defaultValue: "ACCUMULATION",
          validate: {
            isIn: {
              args: [["ACCUMULATION", "MARKUP", "DISTRIBUTION", "MARKDOWN"]],
              msg: "currentPhase: Must be ACCUMULATION, MARKUP, DISTRIBUTION, or MARKDOWN",
            },
          },
        },
        phaseStartedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
        nextPhaseChangeAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        },
        phaseTargetPrice: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: true,
          defaultValue: null,
          get() {
            const value = this.getDataValue("phaseTargetPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },

        // Volatility Configuration
        baseVolatility: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 2.0, // 2% daily volatility
          validate: {
            isDecimal: { msg: "baseVolatility: Must be a valid decimal number" },
            min: { args: [0.1], msg: "baseVolatility: Must be at least 0.1" },
            max: { args: [50], msg: "baseVolatility: Must be at most 50" },
          },
          get() {
            const value = this.getDataValue("baseVolatility");
            return value ? parseFloat(value.toString()) : 2.0;
          },
        },
        volatilityMultiplier: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: false,
          defaultValue: 1.0,
          validate: {
            isDecimal: { msg: "volatilityMultiplier: Must be a valid decimal number" },
            min: { args: [0.5], msg: "volatilityMultiplier: Must be at least 0.5" },
            max: { args: [2.0], msg: "volatilityMultiplier: Must be at most 2.0" },
          },
          get() {
            const value = this.getDataValue("volatilityMultiplier");
            return value ? parseFloat(value.toString()) : 1.0;
          },
        },
        momentumDecay: {
          type: DataTypes.DECIMAL(4, 3),
          allowNull: false,
          defaultValue: 0.95, // 5% decay per tick
          validate: {
            isDecimal: { msg: "momentumDecay: Must be a valid decimal number" },
            min: { args: [0.8], msg: "momentumDecay: Must be at least 0.8" },
            max: { args: [0.999], msg: "momentumDecay: Must be at most 0.999" },
          },
          get() {
            const value = this.getDataValue("momentumDecay");
            return value ? parseFloat(value.toString()) : 0.95;
          },
        },

        // State Persistence
        lastKnownPrice: {
          type: DataTypes.DECIMAL(30, 18),
          allowNull: true,
          defaultValue: null,
          get() {
            const value = this.getDataValue("lastKnownPrice");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        trendMomentum: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0, // Neutral momentum
          validate: {
            isDecimal: { msg: "trendMomentum: Must be a valid decimal number" },
            min: { args: [-1], msg: "trendMomentum: Must be at least -1" },
            max: { args: [1], msg: "trendMomentum: Must be at most 1" },
          },
          get() {
            const value = this.getDataValue("trendMomentum");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        lastMomentumUpdate: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
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
