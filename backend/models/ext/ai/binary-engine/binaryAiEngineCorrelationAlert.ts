import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Alert severity levels
 */
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Alert status
 */
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineCorrelationAlertAttributes {
  id: string;
  engineId: string;
  symbol: string;
  internalPrice: number;
  externalPrice: number;
  deviationPercent: number;
  priceSource: string;
  severity: AlertSeverity;
  status: AlertStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineCorrelationAlertCreationAttributes
  extends Optional<
    binaryAiEngineCorrelationAlertAttributes,
    | "id"
    | "severity"
    | "status"
    | "acknowledgedBy"
    | "acknowledgedAt"
    | "resolvedAt"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine Correlation Alert - External price deviation alerts
 *
 * This model tracks alerts when internal ecosystem prices deviate
 * significantly from external market prices.
 *
 * Business Rules:
 * - Alerts are created when deviation exceeds configured threshold
 * - Severity is based on deviation percentage
 * - Alerts must be acknowledged and resolved by admins
 * - Helps detect manipulation detection risks
 *
 * Severity Levels:
 * - LOW: < 2% deviation
 * - MEDIUM: 2-5% deviation
 * - HIGH: 5-10% deviation
 * - CRITICAL: > 10% deviation
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineCorrelationAlert
  extends Model<
    binaryAiEngineCorrelationAlertAttributes,
    binaryAiEngineCorrelationAlertCreationAttributes
  >
  implements binaryAiEngineCorrelationAlertAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Symbol with deviation */
  symbol!: string;
  /** Internal ecosystem price */
  internalPrice!: number;
  /** External market price */
  externalPrice!: number;
  /** Deviation percentage */
  deviationPercent!: number;
  /** Source of external price */
  priceSource!: string;
  /** Alert severity */
  severity!: AlertSeverity;
  /** Alert status */
  status!: AlertStatus;
  /** Who acknowledged the alert */
  acknowledgedBy!: string | null;
  /** When alert was acknowledged */
  acknowledgedAt!: Date | null;
  /** When alert was resolved */
  resolvedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineCorrelationAlert {
    return binaryAiEngineCorrelationAlert.init(
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
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
        },
        internalPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("internalPrice");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        externalPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("externalPrice");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        deviationPercent: {
          type: DataTypes.DECIMAL(7, 6),
          allowNull: false,
          get() {
            const value = this.getDataValue("deviationPercent");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        priceSource: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        severity: {
          type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
          allowNull: false,
          defaultValue: "MEDIUM",
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "ACKNOWLEDGED", "RESOLVED"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        acknowledgedBy: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        acknowledgedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        resolvedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineCorrelationAlert",
        tableName: "binary_ai_engine_correlation_alert",
        timestamps: true,
        indexes: [
          { fields: ["engineId"] },
          { fields: ["status"] },
          { fields: ["severity"] },
          { fields: ["createdAt"] },
          { fields: ["symbol"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Alert belongs to engine
    binaryAiEngineCorrelationAlert.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
