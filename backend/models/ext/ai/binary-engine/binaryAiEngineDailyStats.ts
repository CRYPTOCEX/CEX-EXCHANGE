import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineDailyStatsAttributes {
  id: string;
  engineId: string;
  date: string; // DATEONLY format: YYYY-MM-DD
  isDemo: boolean;
  totalOrdersProcessed: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  platformProfit: number;
  effectiveUserWinRate: number;
  targetUserWinRate: number;
  profitMargin: number;
  priceAdjustmentCount: number;
  avgAdjustmentPercent: number;
  largestAdjustmentPercent: number;
  whaleOrdersCount: number;
  cooldownsApplied: number;
  tierBreakdown: Record<string, number> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineDailyStatsCreationAttributes
  extends Optional<
    binaryAiEngineDailyStatsAttributes,
    | "id"
    | "isDemo"
    | "totalOrdersProcessed"
    | "totalWins"
    | "totalLosses"
    | "totalDraws"
    | "platformProfit"
    | "effectiveUserWinRate"
    | "targetUserWinRate"
    | "profitMargin"
    | "priceAdjustmentCount"
    | "avgAdjustmentPercent"
    | "largestAdjustmentPercent"
    | "whaleOrdersCount"
    | "cooldownsApplied"
    | "tierBreakdown"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine Daily Stats - Aggregated daily statistics
 *
 * This model stores daily aggregated statistics for the engine,
 * providing historical data for analytics and reporting.
 *
 * Business Rules:
 * - One record per engine per date per mode (live/demo)
 * - Stats are updated throughout the day
 * - Provides profit margin and win rate tracking
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineDailyStats
  extends Model<
    binaryAiEngineDailyStatsAttributes,
    binaryAiEngineDailyStatsCreationAttributes
  >
  implements binaryAiEngineDailyStatsAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Date of statistics (YYYY-MM-DD) */
  date!: string;
  /** Whether these stats are for demo mode */
  isDemo!: boolean;
  /** Total orders processed */
  totalOrdersProcessed!: number;
  /** Total user wins */
  totalWins!: number;
  /** Total user losses */
  totalLosses!: number;
  /** Total draws */
  totalDraws!: number;
  /** Platform profit for the day */
  platformProfit!: number;
  /** Actual user win rate achieved */
  effectiveUserWinRate!: number;
  /** Target user win rate for the day */
  targetUserWinRate!: number;
  /** Profit margin (platform profit / total volume) */
  profitMargin!: number;
  /** Number of price adjustments made */
  priceAdjustmentCount!: number;
  /** Average adjustment percentage */
  avgAdjustmentPercent!: number;
  /** Largest single adjustment */
  largestAdjustmentPercent!: number;
  /** Number of whale orders */
  whaleOrdersCount!: number;
  /** Number of cooldowns applied */
  cooldownsApplied!: number;
  /** Breakdown by user tier */
  tierBreakdown!: Record<string, number> | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineDailyStats {
    return binaryAiEngineDailyStats.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        engineId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "engineId: Engine ID must not be empty" },
            isUUID: { args: 4, msg: "engineId: Must be a valid UUID" },
          },
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        isDemo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        totalOrdersProcessed: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalWins: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalLosses: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalDraws: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        platformProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0.0,
          get() {
            const value = this.getDataValue("platformProfit");
            return value !== null ? parseFloat(value as any) : 0.0;
          },
        },
        effectiveUserWinRate: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.0,
          get() {
            const value = this.getDataValue("effectiveUserWinRate");
            return value !== null ? parseFloat(value as any) : 0.0;
          },
        },
        targetUserWinRate: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.0,
          get() {
            const value = this.getDataValue("targetUserWinRate");
            return value !== null ? parseFloat(value as any) : 0.0;
          },
        },
        profitMargin: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0.0,
          get() {
            const value = this.getDataValue("profitMargin");
            return value !== null ? parseFloat(value as any) : 0.0;
          },
        },
        priceAdjustmentCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        avgAdjustmentPercent: {
          type: DataTypes.DECIMAL(7, 6),
          allowNull: false,
          defaultValue: 0.0,
          get() {
            const value = this.getDataValue("avgAdjustmentPercent");
            return value !== null ? parseFloat(value as any) : 0.0;
          },
        },
        largestAdjustmentPercent: {
          type: DataTypes.DECIMAL(7, 6),
          allowNull: false,
          defaultValue: 0.0,
          get() {
            const value = this.getDataValue("largestAdjustmentPercent");
            return value !== null ? parseFloat(value as any) : 0.0;
          },
        },
        whaleOrdersCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        cooldownsApplied: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        tierBreakdown: {
          type: DataTypes.JSON,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineDailyStats",
        tableName: "binary_ai_engine_daily_stats",
        timestamps: true,
        indexes: [
          { fields: ["engineId", "date", "isDemo"], unique: true },
          { fields: ["date"] },
          { fields: ["engineId"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Stats belong to engine
    binaryAiEngineDailyStats.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
