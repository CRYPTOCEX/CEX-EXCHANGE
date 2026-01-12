import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineAttributes {
  id: string;
  marketMakerId: string;
  status: BinaryAiEngineStatus;
  targetUserWinRate: number;
  winRateVariance: number;
  winRateResetHours: number;
  practiceMode: PracticeModeOption;
  practiceTargetWinRate: number;
  practiceWinRateVariance: number;
  optimizationStrategy: OptimizationStrategy;
  maxPriceAdjustmentPercent: number;
  adjustmentLeadTimeSeconds: number;
  volatilityMaskingEnabled: boolean;
  volatilityNoisePercent: number;
  enableUserTiers: boolean;
  tierCalculationMethod: TierCalculationMethod;
  enableBigWinCooldown: boolean;
  bigWinThreshold: number;
  cooldownDurationMinutes: number;
  cooldownWinRateReduction: number;
  enableWhaleDetection: boolean;
  whaleThreshold: number;
  whaleStrategy: WhaleStrategy;
  simulationMode: boolean;
  logSimulatedActions: boolean;
  enableExternalCorrelation: boolean;
  externalPriceSource: string | null;
  maxDeviationPercent: number;
  allowedOrderTypes: string[];
  minPositionForOptimization: number;
  maxDailyLoss: number;
  maxSingleOrderExposure: number;
  currentPeriodWins: number;
  currentPeriodLosses: number;
  currentPeriodPlatformProfit: number;
  lastPeriodResetAt: Date;
  practicePeriodWins: number;
  practicePeriodLosses: number;
  lastPracticePeriodResetAt: Date;
  lastSnapshotId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineCreationAttributes
  extends Optional<
    binaryAiEngineAttributes,
    | "id"
    | "status"
    | "targetUserWinRate"
    | "winRateVariance"
    | "winRateResetHours"
    | "practiceMode"
    | "practiceTargetWinRate"
    | "practiceWinRateVariance"
    | "optimizationStrategy"
    | "maxPriceAdjustmentPercent"
    | "adjustmentLeadTimeSeconds"
    | "volatilityMaskingEnabled"
    | "volatilityNoisePercent"
    | "enableUserTiers"
    | "tierCalculationMethod"
    | "enableBigWinCooldown"
    | "bigWinThreshold"
    | "cooldownDurationMinutes"
    | "cooldownWinRateReduction"
    | "enableWhaleDetection"
    | "whaleThreshold"
    | "whaleStrategy"
    | "simulationMode"
    | "logSimulatedActions"
    | "enableExternalCorrelation"
    | "externalPriceSource"
    | "maxDeviationPercent"
    | "allowedOrderTypes"
    | "minPositionForOptimization"
    | "maxDailyLoss"
    | "maxSingleOrderExposure"
    | "currentPeriodWins"
    | "currentPeriodLosses"
    | "currentPeriodPlatformProfit"
    | "lastPeriodResetAt"
    | "practicePeriodWins"
    | "practicePeriodLosses"
    | "lastPracticePeriodResetAt"
    | "lastSnapshotId"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Status of a Binary AI Engine
 * - ACTIVE: Engine is running and processing positions
 * - PAUSED: Temporarily paused, can be resumed
 * - STOPPED: Fully stopped, requires start to resume
 */
export type BinaryAiEngineStatus = "ACTIVE" | "PAUSED" | "STOPPED";

/**
 * Practice mode configuration
 * - DISABLED: No win rate manipulation in practice mode (natural ~50% wins)
 * - SAME_AS_LIVE: Same win rate targeting as live mode
 * - CUSTOM: Separate custom win rate for practice mode
 */
export type PracticeModeOption = "DISABLED" | "SAME_AS_LIVE" | "CUSTOM";

/**
 * Price optimization strategy
 * - CONSERVATIVE: Minimal adjustments (0.2%)
 * - MODERATE: Balanced adjustments (0.3%)
 * - AGGRESSIVE: Larger adjustments (0.5%)
 */
export type OptimizationStrategy = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";

/**
 * Whale handling strategy
 * - REDUCE_EXPOSURE: Reduce win rate for whale positions
 * - ALERT_ONLY: Only alert, don't manipulate
 * - FORCE_LOSS: Force whale positions to lose
 */
export type WhaleStrategy = "REDUCE_EXPOSURE" | "ALERT_ONLY" | "FORCE_LOSS";

/**
 * User tier calculation method
 * - VOLUME: Based on trading volume
 * - DEPOSIT: Based on total deposits
 * - MANUAL: Manually assigned by admin
 */
export type TierCalculationMethod = "VOLUME" | "DEPOSIT" | "MANUAL";

/**
 * Binary AI Engine - Core model for binary trading outcome optimization
 *
 * This model manages AI-powered outcome optimization for binary trading,
 * integrating with the AI Market Maker to control ecosystem market prices.
 *
 * Business Rules:
 * - One engine per AI Market Maker (unique marketMakerId constraint)
 * - targetUserWinRate should be between 0.25 and 0.45 (25%-45% user wins)
 * - Platform profit = 1 - targetUserWinRate (e.g., 65% profit at 35% user wins)
 *
 * Related Models:
 * - aiMarketMaker (N:1) - The market maker controlling prices
 * - binaryAiEnginePosition (1:N) - Tracked positions
 * - binaryAiEngineAction (1:N) - Audit log
 * - binaryAiEngineDailyStats (1:N) - Daily statistics
 * - binaryAiEngineUserTier (1:N) - User tier configurations
 * - binaryAiEngineUserCooldown (1:N) - Active cooldowns
 * - binaryAiEngineSnapshot (1:N) - Configuration snapshots
 */
export default class binaryAiEngine
  extends Model<binaryAiEngineAttributes, binaryAiEngineCreationAttributes>
  implements binaryAiEngineAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the AI Market Maker controlling prices */
  marketMakerId!: string;
  /** Current operational status */
  status!: BinaryAiEngineStatus;

  // ============================================
  // LIVE WIN RATE SETTINGS
  // ============================================
  /** Target user win rate (0.25-0.45, e.g., 0.35 = 35%) */
  targetUserWinRate!: number;
  /** Acceptable variance from target (e.g., 0.05 = ±5%) */
  winRateVariance!: number;
  /** Hours between win rate period resets */
  winRateResetHours!: number;

  // ============================================
  // PRACTICE MODE SETTINGS
  // ============================================
  /** Practice mode behavior */
  practiceMode!: PracticeModeOption;
  /** Target win rate for practice mode when CUSTOM */
  practiceTargetWinRate!: number;
  /** Win rate variance for practice mode */
  practiceWinRateVariance!: number;

  // ============================================
  // OPTIMIZATION STRATEGY
  // ============================================
  /** Price optimization aggressiveness */
  optimizationStrategy!: OptimizationStrategy;
  /** Maximum price adjustment percent (e.g., 0.003 = 0.3%) */
  maxPriceAdjustmentPercent!: number;
  /** Seconds before expiry to start adjustments */
  adjustmentLeadTimeSeconds!: number;
  /** Add random noise to mask patterns */
  volatilityMaskingEnabled!: boolean;
  /** Noise percentage (e.g., 0.001 = 0.1%) */
  volatilityNoisePercent!: number;

  // ============================================
  // USER TIER SETTINGS (V2)
  // ============================================
  /** Enable user tier-based win rate bonuses */
  enableUserTiers!: boolean;
  /** How to calculate user tiers */
  tierCalculationMethod!: TierCalculationMethod;

  // ============================================
  // COOLDOWN SETTINGS (V2)
  // ============================================
  /** Enable cooldown after big wins */
  enableBigWinCooldown!: boolean;
  /** Profit threshold to trigger cooldown */
  bigWinThreshold!: number;
  /** Cooldown duration in minutes */
  cooldownDurationMinutes!: number;
  /** Win rate reduction during cooldown (e.g., 0.10 = -10%) */
  cooldownWinRateReduction!: number;

  // ============================================
  // WHALE DETECTION SETTINGS (V2)
  // ============================================
  /** Enable whale position detection */
  enableWhaleDetection!: boolean;
  /** Position amount threshold for whale status */
  whaleThreshold!: number;
  /** How to handle whale positions */
  whaleStrategy!: WhaleStrategy;

  // ============================================
  // SIMULATION MODE SETTINGS (V2)
  // ============================================
  /** Run in simulation mode (no real changes) */
  simulationMode!: boolean;
  /** Log simulated actions to audit trail */
  logSimulatedActions!: boolean;

  // ============================================
  // EXTERNAL CORRELATION SETTINGS (V2)
  // ============================================
  /** Enable external price correlation monitoring */
  enableExternalCorrelation!: boolean;
  /** External price source (BINANCE, COINGECKO, etc.) */
  externalPriceSource!: string | null;
  /** Maximum deviation percent before alert */
  maxDeviationPercent!: number;

  // ============================================
  // ORDER RESTRICTIONS
  // ============================================
  /** Allowed order types (currently only RISE_FALL) */
  allowedOrderTypes!: string[];
  /** Minimum position size for optimization */
  minPositionForOptimization!: number;

  // ============================================
  // RISK LIMITS
  // ============================================
  /** Maximum daily platform loss before auto-pause */
  maxDailyLoss!: number;
  /** Maximum single order exposure */
  maxSingleOrderExposure!: number;

  // ============================================
  // LIVE STATISTICS
  // ============================================
  /** User wins in current period */
  currentPeriodWins!: number;
  /** User losses in current period */
  currentPeriodLosses!: number;
  /** Platform profit in current period */
  currentPeriodPlatformProfit!: number;
  /** When period was last reset */
  lastPeriodResetAt!: Date;

  // ============================================
  // PRACTICE STATISTICS
  // ============================================
  /** Practice mode wins in current period */
  practicePeriodWins!: number;
  /** Practice mode losses in current period */
  practicePeriodLosses!: number;
  /** When practice period was last reset */
  lastPracticePeriodResetAt!: Date;

  // ============================================
  // ROLLBACK SUPPORT (V2)
  // ============================================
  /** Last snapshot ID for quick reference */
  lastSnapshotId!: string | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  marketMaker?: any;
  positions?: any[];
  actions?: any[];
  dailyStats?: any[];
  userTiers?: any[];
  userCooldowns?: any[];
  snapshots?: any[];
  simulations?: any[];
  abTests?: any[];
  cohorts?: any[];
  correlationAlerts?: any[];

  public static initModel(sequelize: Sequelize.Sequelize): typeof binaryAiEngine {
    return binaryAiEngine.init(
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
          unique: true,
          validate: {
            notEmpty: { msg: "marketMakerId: Market Maker ID must not be empty" },
            isUUID: { args: 4, msg: "marketMakerId: Must be a valid UUID" },
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "PAUSED", "STOPPED"),
          allowNull: false,
          defaultValue: "STOPPED",
        },

        // Win Rate Settings
        targetUserWinRate: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.35,
          validate: {
            min: { args: [0.25], msg: "targetUserWinRate: Must be at least 0.25" },
            max: { args: [0.45], msg: "targetUserWinRate: Must be at most 0.45" },
          },
          get() {
            const value = this.getDataValue("targetUserWinRate");
            return value !== null ? parseFloat(value as any) : 0.35;
          },
        },
        winRateVariance: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.05,
          get() {
            const value = this.getDataValue("winRateVariance");
            return value !== null ? parseFloat(value as any) : 0.05;
          },
        },
        winRateResetHours: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 24,
        },

        // Practice Mode Settings
        practiceMode: {
          type: DataTypes.ENUM("DISABLED", "SAME_AS_LIVE", "CUSTOM"),
          allowNull: false,
          defaultValue: "DISABLED",
        },
        practiceTargetWinRate: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.55,
          get() {
            const value = this.getDataValue("practiceTargetWinRate");
            return value !== null ? parseFloat(value as any) : 0.55;
          },
        },
        practiceWinRateVariance: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.1,
          get() {
            const value = this.getDataValue("practiceWinRateVariance");
            return value !== null ? parseFloat(value as any) : 0.1;
          },
        },

        // Optimization Strategy
        optimizationStrategy: {
          type: DataTypes.ENUM("CONSERVATIVE", "MODERATE", "AGGRESSIVE"),
          allowNull: false,
          defaultValue: "MODERATE",
        },
        maxPriceAdjustmentPercent: {
          type: DataTypes.DECIMAL(7, 6),
          allowNull: false,
          defaultValue: 0.003,
          get() {
            const value = this.getDataValue("maxPriceAdjustmentPercent");
            return value !== null ? parseFloat(value as any) : 0.003;
          },
        },
        adjustmentLeadTimeSeconds: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 30,
        },
        volatilityMaskingEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        volatilityNoisePercent: {
          type: DataTypes.DECIMAL(7, 6),
          allowNull: false,
          defaultValue: 0.001,
          get() {
            const value = this.getDataValue("volatilityNoisePercent");
            return value !== null ? parseFloat(value as any) : 0.001;
          },
        },

        // User Tier Settings (V2)
        enableUserTiers: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        tierCalculationMethod: {
          type: DataTypes.ENUM("VOLUME", "DEPOSIT", "MANUAL"),
          allowNull: false,
          defaultValue: "VOLUME",
        },

        // Cooldown Settings (V2)
        enableBigWinCooldown: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        bigWinThreshold: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 1000.0,
          get() {
            const value = this.getDataValue("bigWinThreshold");
            return value !== null ? parseFloat(value as any) : 1000.0;
          },
        },
        cooldownDurationMinutes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 60,
        },
        cooldownWinRateReduction: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.1,
          get() {
            const value = this.getDataValue("cooldownWinRateReduction");
            return value !== null ? parseFloat(value as any) : 0.1;
          },
        },

        // Whale Detection Settings (V2)
        enableWhaleDetection: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        whaleThreshold: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 5000.0,
          get() {
            const value = this.getDataValue("whaleThreshold");
            return value !== null ? parseFloat(value as any) : 5000.0;
          },
        },
        whaleStrategy: {
          type: DataTypes.ENUM("REDUCE_EXPOSURE", "ALERT_ONLY", "FORCE_LOSS"),
          allowNull: false,
          defaultValue: "REDUCE_EXPOSURE",
        },

        // Simulation Mode Settings (V2)
        simulationMode: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        logSimulatedActions: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },

        // External Correlation Settings (V2)
        enableExternalCorrelation: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        externalPriceSource: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        maxDeviationPercent: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.05,
          get() {
            const value = this.getDataValue("maxDeviationPercent");
            return value !== null ? parseFloat(value as any) : 0.05;
          },
        },

        // Order Restrictions
        allowedOrderTypes: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: ["RISE_FALL"],
        },
        minPositionForOptimization: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 10.0,
          get() {
            const value = this.getDataValue("minPositionForOptimization");
            return value !== null ? parseFloat(value as any) : 10.0;
          },
        },

        // Risk Limits
        maxDailyLoss: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 10000.0,
          get() {
            const value = this.getDataValue("maxDailyLoss");
            return value !== null ? parseFloat(value as any) : 10000.0;
          },
        },
        maxSingleOrderExposure: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 5000.0,
          get() {
            const value = this.getDataValue("maxSingleOrderExposure");
            return value !== null ? parseFloat(value as any) : 5000.0;
          },
        },

        // Live Statistics
        currentPeriodWins: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        currentPeriodLosses: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        currentPeriodPlatformProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0.0,
          get() {
            const value = this.getDataValue("currentPeriodPlatformProfit");
            return value !== null ? parseFloat(value as any) : 0.0;
          },
        },
        lastPeriodResetAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },

        // Practice Statistics
        practicePeriodWins: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        practicePeriodLosses: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        lastPracticePeriodResetAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },

        // Rollback Support (V2)
        lastSnapshotId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngine",
        tableName: "binary_ai_engine",
        timestamps: true,
        indexes: [
          { fields: ["marketMakerId"], unique: true },
          { fields: ["status"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Engine belongs to AI Market Maker
    binaryAiEngine.belongsTo(models.aiMarketMaker, {
      foreignKey: "marketMakerId",
      as: "marketMaker",
    });

    // Engine has many positions
    binaryAiEngine.hasMany(models.binaryAiEnginePosition, {
      foreignKey: "engineId",
      as: "positions",
      onDelete: "CASCADE",
    });

    // Engine has many actions (audit log)
    binaryAiEngine.hasMany(models.binaryAiEngineAction, {
      foreignKey: "engineId",
      as: "actions",
      onDelete: "CASCADE",
    });

    // Engine has many daily stats
    binaryAiEngine.hasMany(models.binaryAiEngineDailyStats, {
      foreignKey: "engineId",
      as: "dailyStats",
      onDelete: "CASCADE",
    });

    // Engine has many user tiers
    binaryAiEngine.hasMany(models.binaryAiEngineUserTier, {
      foreignKey: "engineId",
      as: "userTiers",
      onDelete: "CASCADE",
    });

    // Engine has many user cooldowns
    binaryAiEngine.hasMany(models.binaryAiEngineUserCooldown, {
      foreignKey: "engineId",
      as: "userCooldowns",
      onDelete: "CASCADE",
    });

    // Engine has many snapshots
    binaryAiEngine.hasMany(models.binaryAiEngineSnapshot, {
      foreignKey: "engineId",
      as: "snapshots",
      onDelete: "CASCADE",
    });

    // Engine has many simulations
    binaryAiEngine.hasMany(models.binaryAiEngineSimulation, {
      foreignKey: "engineId",
      as: "simulations",
      onDelete: "CASCADE",
    });

    // Engine has many A/B tests
    binaryAiEngine.hasMany(models.binaryAiEngineABTest, {
      foreignKey: "engineId",
      as: "abTests",
      onDelete: "CASCADE",
    });

    // Engine has many cohorts
    binaryAiEngine.hasMany(models.binaryAiEngineCohort, {
      foreignKey: "engineId",
      as: "cohorts",
      onDelete: "CASCADE",
    });

    // Engine has many correlation alerts
    binaryAiEngine.hasMany(models.binaryAiEngineCorrelationAlert, {
      foreignKey: "engineId",
      as: "correlationAlerts",
      onDelete: "CASCADE",
    });
  }
}
