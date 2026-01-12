import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Cohort type for user segmentation
 */
export type CohortType = "SIGNUP_DATE" | "DEPOSIT_AMOUNT" | "TRADE_FREQUENCY" | "CUSTOM";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineCohortAttributes {
  id: string;
  engineId: string;
  cohortName: string;
  cohortType: CohortType;
  startDate: Date | null;
  endDate: Date | null;
  minValue: number | null;
  maxValue: number | null;
  customCriteria: Record<string, any> | null;
  userCount: number;
  totalOrders: number;
  totalWins: number;
  avgWinRate: number;
  totalProfit: number;
  lastCalculatedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineCohortCreationAttributes
  extends Optional<
    binaryAiEngineCohortAttributes,
    | "id"
    | "startDate"
    | "endDate"
    | "minValue"
    | "maxValue"
    | "customCriteria"
    | "userCount"
    | "totalOrders"
    | "totalWins"
    | "avgWinRate"
    | "totalProfit"
    | "lastCalculatedAt"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine Cohort - User cohort analysis
 *
 * This model defines user cohorts for behavioral analysis,
 * helping to understand different user segments' trading patterns.
 *
 * Business Rules:
 * - Cohorts can be based on signup date, deposit amount, or trade frequency
 * - Statistics are calculated periodically and cached
 * - Helps identify high-value vs problematic user segments
 * - Can inform tier/cooldown strategy adjustments
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineCohort
  extends Model<
    binaryAiEngineCohortAttributes,
    binaryAiEngineCohortCreationAttributes
  >
  implements binaryAiEngineCohortAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Name of the cohort */
  cohortName!: string;
  /** Type of cohort segmentation */
  cohortType!: CohortType;
  /** Start date for SIGNUP_DATE cohorts */
  startDate!: Date | null;
  /** End date for SIGNUP_DATE cohorts */
  endDate!: Date | null;
  /** Minimum value for DEPOSIT_AMOUNT or TRADE_FREQUENCY */
  minValue!: number | null;
  /** Maximum value for DEPOSIT_AMOUNT or TRADE_FREQUENCY */
  maxValue!: number | null;
  /** Custom criteria for CUSTOM cohorts */
  customCriteria!: Record<string, any> | null;
  /** Number of users in cohort */
  userCount!: number;
  /** Total orders from cohort */
  totalOrders!: number;
  /** Total wins in cohort */
  totalWins!: number;
  /** Average win rate for cohort */
  avgWinRate!: number;
  /** Total profit from cohort */
  totalProfit!: number;
  /** When stats were last calculated */
  lastCalculatedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineCohort {
    return binaryAiEngineCohort.init(
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
        cohortName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "cohortName: Cohort name must not be empty" },
          },
        },
        cohortType: {
          type: DataTypes.ENUM("SIGNUP_DATE", "DEPOSIT_AMOUNT", "TRADE_FREQUENCY", "CUSTOM"),
          allowNull: false,
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        minValue: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("minValue");
            return value !== null ? parseFloat(value as any) : null;
          },
        },
        maxValue: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("maxValue");
            return value !== null ? parseFloat(value as any) : null;
          },
        },
        customCriteria: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        userCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalOrders: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalWins: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        avgWinRate: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("avgWinRate");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        totalProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalProfit");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        lastCalculatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineCohort",
        tableName: "binary_ai_engine_cohort",
        timestamps: true,
        indexes: [
          { fields: ["engineId"] },
          { fields: ["cohortType"] },
          { fields: ["cohortName"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Cohort belongs to engine
    binaryAiEngineCohort.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
