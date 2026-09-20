import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

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
  name?: string;
  description?: string;
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
    | "name"
    | "description"
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
  /** Simulation name */
  name?: string;
  /** Simulation description */
  description?: string;
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
            isUUID: { args: ANY_UUID_VERSION, msg: "engineId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
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
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: binaryAiEngineSimulation) {
            const value = this.getDataValue("configUsed") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        summary: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: binaryAiEngineSimulation) {
            const value = this.getDataValue("summary") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
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
