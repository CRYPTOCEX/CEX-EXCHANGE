import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineCorrelationHistoryAttributes {
  id: string;
  engineId: string;
  symbol: string;
  internalPrice: number;
  externalPrice: number;
  deviationPercent: number;
  provider: string;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineCorrelationHistoryCreationAttributes
  extends Optional<
    binaryAiEngineCorrelationHistoryAttributes,
    "id" | "timestamp" | "createdAt" | "updatedAt"
  > {}

/**
 * Binary AI Engine Correlation History - Stores historical price correlation data
 *
 * This model tracks the history of price correlations between internal and external
 * price feeds for analysis and debugging purposes.
 *
 * Business Rules:
 * - Records are immutable once created
 * - Used for historical analysis and auditing
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineCorrelationHistory
  extends Model<
    binaryAiEngineCorrelationHistoryAttributes,
    binaryAiEngineCorrelationHistoryCreationAttributes
  >
  implements binaryAiEngineCorrelationHistoryAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Trading symbol (e.g., BTC/USD) */
  symbol!: string;
  /** Internal price at check time */
  internalPrice!: number;
  /** External price from provider */
  externalPrice!: number;
  /** Deviation percentage */
  deviationPercent!: number;
  /** External price provider name */
  provider!: string;
  /** Timestamp of the price check */
  timestamp!: Date;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineCorrelationHistory {
    return binaryAiEngineCorrelationHistory.init(
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
          type: DataTypes.STRING(50),
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
          type: DataTypes.DECIMAL(8, 4),
          allowNull: false,
          get() {
            const value = this.getDataValue("deviationPercent");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        provider: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "provider: Provider must not be empty" },
          },
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineCorrelationHistory",
        tableName: "binary_ai_engine_correlation_history",
        timestamps: true,
        indexes: [
          { fields: ["engineId"] },
          { fields: ["symbol"] },
          { fields: ["provider"] },
          { fields: ["timestamp"] },
          { fields: ["engineId", "symbol", "timestamp"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Correlation history belongs to engine
    binaryAiEngineCorrelationHistory.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
