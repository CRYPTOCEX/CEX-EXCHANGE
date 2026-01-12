import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Action types for audit logging
 */
export type EngineActionType =
  | "PRICE_ADJUSTMENT"
  | "OUTCOME_OVERRIDE"
  | "PERIOD_RESET"
  | "CONFIG_CHANGE"
  | "ENGINE_START"
  | "ENGINE_STOP"
  | "ENGINE_PAUSE"
  | "EMERGENCY_STOP"
  | "MANUAL_OVERRIDE"
  | "TIER_ADJUSTMENT"
  | "COOLDOWN_APPLIED"
  | "COOLDOWN_REMOVED"
  | "WHALE_DETECTED"
  | "WHALE_HANDLED"
  | "SIMULATION_RUN"
  | "ROLLBACK_EXECUTED"
  | "CORRELATION_ALERT"
  | "AB_TEST_STARTED"
  | "AB_TEST_ENDED";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineActionAttributes {
  id: string;
  engineId: string;
  actionType: EngineActionType;
  symbol: string | null;
  details: Record<string, any> | null;
  previousValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  triggeredBy: string;
  isDemo: boolean;
  isSimulated: boolean;
  affectedUserId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineActionCreationAttributes
  extends Optional<
    binaryAiEngineActionAttributes,
    | "id"
    | "symbol"
    | "details"
    | "previousValue"
    | "newValue"
    | "triggeredBy"
    | "isDemo"
    | "isSimulated"
    | "affectedUserId"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine Action - Immutable audit log for all engine actions
 *
 * This model records every action taken by the engine, providing a complete
 * audit trail for compliance, debugging, and analytics.
 *
 * Business Rules:
 * - Actions are immutable (never updated or deleted)
 * - All configuration changes must be logged
 * - Price manipulations must include before/after values
 * - Simulated actions are flagged separately
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineAction
  extends Model<
    binaryAiEngineActionAttributes,
    binaryAiEngineActionCreationAttributes
  >
  implements binaryAiEngineActionAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Type of action performed */
  actionType!: EngineActionType;
  /** Symbol involved (if applicable) */
  symbol!: string | null;
  /** Additional action details */
  details!: Record<string, any> | null;
  /** Value before the action */
  previousValue!: Record<string, any> | null;
  /** Value after the action */
  newValue!: Record<string, any> | null;
  /** Who/what triggered the action (SYSTEM, admin ID, etc.) */
  triggeredBy!: string;
  /** Whether this action was for demo/practice mode */
  isDemo!: boolean;
  /** Whether this was a simulated action (not applied) */
  isSimulated!: boolean;
  /** User affected by this action (if applicable) */
  affectedUserId!: string | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineAction {
    return binaryAiEngineAction.init(
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
        actionType: {
          type: DataTypes.ENUM(
            "PRICE_ADJUSTMENT",
            "OUTCOME_OVERRIDE",
            "PERIOD_RESET",
            "CONFIG_CHANGE",
            "ENGINE_START",
            "ENGINE_STOP",
            "ENGINE_PAUSE",
            "EMERGENCY_STOP",
            "MANUAL_OVERRIDE",
            "TIER_ADJUSTMENT",
            "COOLDOWN_APPLIED",
            "COOLDOWN_REMOVED",
            "WHALE_DETECTED",
            "WHALE_HANDLED",
            "SIMULATION_RUN",
            "ROLLBACK_EXECUTED",
            "CORRELATION_ALERT",
            "AB_TEST_STARTED",
            "AB_TEST_ENDED"
          ),
          allowNull: false,
        },
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        details: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        previousValue: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        newValue: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        triggeredBy: {
          type: DataTypes.STRING(100),
          allowNull: false,
          defaultValue: "SYSTEM",
        },
        isDemo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isSimulated: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        affectedUserId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineAction",
        tableName: "binary_ai_engine_action",
        timestamps: true,
        indexes: [
          { fields: ["engineId"] },
          { fields: ["actionType"] },
          { fields: ["createdAt"] },
          { fields: ["isSimulated"] },
          { fields: ["affectedUserId"] },
          { fields: ["isDemo"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Action belongs to engine
    binaryAiEngineAction.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
