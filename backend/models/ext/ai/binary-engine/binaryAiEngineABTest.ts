import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * A/B Test status
 */
export type ABTestStatus = "DRAFT" | "RUNNING" | "COMPLETED" | "CANCELLED";

/**
 * A/B Test winning variant
 */
export type ABTestWinner = "CONTROL" | "VARIANT" | "TIE" | "INCONCLUSIVE";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineABTestAttributes {
  id: string;
  engineId: string;
  testName: string;
  status: ABTestStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  controlConfig: Record<string, any>;
  variantConfig: Record<string, any>;
  trafficSplit: number;
  controlOrders: number;
  controlWins: number;
  controlProfit: number;
  variantOrders: number;
  variantWins: number;
  variantProfit: number;
  winningVariant: ABTestWinner | null;
  confidenceLevel: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineABTestCreationAttributes
  extends Optional<
    binaryAiEngineABTestAttributes,
    | "id"
    | "status"
    | "startedAt"
    | "endedAt"
    | "trafficSplit"
    | "controlOrders"
    | "controlWins"
    | "controlProfit"
    | "variantOrders"
    | "variantWins"
    | "variantProfit"
    | "winningVariant"
    | "confidenceLevel"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine A/B Test - A/B testing for configuration optimization
 *
 * This model manages A/B tests that compare two different configurations
 * to determine which performs better.
 *
 * Business Rules:
 * - Traffic is split between control and variant groups
 * - Results are tracked separately for each group
 * - Statistical significance is calculated
 * - Only one A/B test can be running per engine at a time
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineABTest
  extends Model<
    binaryAiEngineABTestAttributes,
    binaryAiEngineABTestCreationAttributes
  >
  implements binaryAiEngineABTestAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Name of the A/B test */
  testName!: string;
  /** Current status */
  status!: ABTestStatus;
  /** When the test started */
  startedAt!: Date | null;
  /** When the test ended */
  endedAt!: Date | null;
  /** Control group configuration */
  controlConfig!: Record<string, any>;
  /** Variant group configuration */
  variantConfig!: Record<string, any>;
  /** Traffic split (0.5 = 50% each) */
  trafficSplit!: number;
  /** Orders in control group */
  controlOrders!: number;
  /** Wins in control group */
  controlWins!: number;
  /** Profit in control group */
  controlProfit!: number;
  /** Orders in variant group */
  variantOrders!: number;
  /** Wins in variant group */
  variantWins!: number;
  /** Profit in variant group */
  variantProfit!: number;
  /** Which variant won */
  winningVariant!: ABTestWinner | null;
  /** Statistical confidence level */
  confidenceLevel!: number | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineABTest {
    return binaryAiEngineABTest.init(
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
        testName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "testName: Test name must not be empty" },
          },
        },
        status: {
          type: DataTypes.ENUM("DRAFT", "RUNNING", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        startedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        endedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        controlConfig: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        variantConfig: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        trafficSplit: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: false,
          defaultValue: 0.5,
          validate: {
            min: { args: [0.1], msg: "trafficSplit: Must be at least 0.1 (10%)" },
            max: { args: [0.9], msg: "trafficSplit: Must be at most 0.9 (90%)" },
          },
          get() {
            const value = this.getDataValue("trafficSplit");
            return value !== null ? parseFloat(value as any) : 0.5;
          },
        },
        controlOrders: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        controlWins: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        controlProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("controlProfit");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        variantOrders: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        variantWins: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        variantProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("variantProfit");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        winningVariant: {
          type: DataTypes.ENUM("CONTROL", "VARIANT", "TIE", "INCONCLUSIVE"),
          allowNull: true,
        },
        confidenceLevel: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: true,
          get() {
            const value = this.getDataValue("confidenceLevel");
            return value !== null ? parseFloat(value as any) : null;
          },
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineABTest",
        tableName: "binary_ai_engine_ab_test",
        timestamps: true,
        indexes: [
          { fields: ["engineId"] },
          { fields: ["status"] },
          { fields: ["startedAt"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // A/B Test belongs to engine
    binaryAiEngineABTest.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
