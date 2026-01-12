import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Simulation status
 */
export type SimulationStatus = "RUNNING" | "COMPLETED" | "CANCELLED";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineSimulationAttributes {
  id: string;
  engineId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: SimulationStatus;
  ordersAnalyzed: number;
  simulatedWins: number;
  simulatedLosses: number;
  simulatedProfit: number;
  priceAdjustmentsWouldHaveMade: number;
  configUsed: Record<string, any> | null;
  summary: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineSimulationCreationAttributes
  extends Optional<
    binaryAiEngineSimulationAttributes,
    | "id"
    | "endedAt"
    | "status"
    | "ordersAnalyzed"
    | "simulatedWins"
    | "simulatedLosses"
    | "simulatedProfit"
    | "priceAdjustmentsWouldHaveMade"
    | "configUsed"
    | "summary"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine Simulation - Simulation run results
 *
 * This model stores results from simulation runs that test
 * configuration changes without affecting real trades.
 *
 * Business Rules:
 * - Simulations analyze historical orders with proposed config
 * - Results show what would have happened with new settings
 * - Helps admins validate changes before applying
 * - Compares simulated results vs actual results
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineSimulation
  extends Model<
    binaryAiEngineSimulationAttributes,
    binaryAiEngineSimulationCreationAttributes
  >
  implements binaryAiEngineSimulationAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** When simulation started */
  startedAt!: Date;
  /** When simulation ended */
  endedAt!: Date | null;
  /** Current status */
  status!: SimulationStatus;
  /** Number of orders analyzed */
  ordersAnalyzed!: number;
  /** Simulated user wins */
  simulatedWins!: number;
  /** Simulated user losses */
  simulatedLosses!: number;
  /** Simulated platform profit */
  simulatedProfit!: number;
  /** Price adjustments that would have been made */
  priceAdjustmentsWouldHaveMade!: number;
  /** Configuration used for simulation */
  configUsed!: Record<string, any> | null;
  /** Detailed simulation summary */
  summary!: Record<string, any> | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineSimulation {
    return binaryAiEngineSimulation.init(
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
        startedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("RUNNING", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "RUNNING",
        },
        ordersAnalyzed: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        simulatedWins: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        simulatedLosses: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        simulatedProfit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("simulatedProfit");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        priceAdjustmentsWouldHaveMade: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        configUsed: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        summary: {
          type: DataTypes.JSON,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineSimulation",
        tableName: "binary_ai_engine_simulation",
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
    // Simulation belongs to engine
    binaryAiEngineSimulation.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
