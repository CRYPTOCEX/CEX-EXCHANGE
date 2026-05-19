import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Reason for cooldown application
 */
export type CooldownReason = "BIG_WIN" | "STREAK" | "MANUAL";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineUserCooldownAttributes {
  id: string;
  engineId: string;
  userId: string;
  reason: CooldownReason;
  triggerOrderId: string | null;
  triggerAmount: number | null;
  winRateReduction: number;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineUserCooldownCreationAttributes
  extends Optional<
    binaryAiEngineUserCooldownAttributes,
    | "id"
    | "reason"
    | "triggerOrderId"
    | "triggerAmount"
    | "isActive"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine User Cooldown - Tracks active user cooldowns
 *
 * This model tracks temporary win rate reductions applied to users
 * after big wins or winning streaks to protect platform profitability.
 *
 * Business Rules:
 * - Cooldowns are automatically applied after wins exceeding threshold
 * - Cooldowns reduce the user's effective win rate during the period
 * - Expired cooldowns should be cleaned up by a scheduled job
 * - Multiple cooldowns can stack (add up reductions)
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 * - user (N:1) - The affected user
 */
export default class binaryAiEngineUserCooldown
  extends Model<
    binaryAiEngineUserCooldownAttributes,
    binaryAiEngineUserCooldownCreationAttributes
  >
  implements binaryAiEngineUserCooldownAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Reference to the user under cooldown */
  userId!: string;
  /** Reason for the cooldown */
  reason!: CooldownReason;
  /** Order that triggered the cooldown (if applicable) */
  triggerOrderId!: string | null;
  /** Win amount that triggered cooldown */
  triggerAmount!: number | null;
  /** Win rate reduction during cooldown (e.g., 0.10 = -10%) */
  winRateReduction!: number;
  /** When the cooldown started */
  startsAt!: Date;
  /** When the cooldown expires */
  expiresAt!: Date;
  /** Whether the cooldown is currently active */
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;
  user?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineUserCooldown {
    return binaryAiEngineUserCooldown.init(
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
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "userId: User ID must not be empty" },
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        reason: {
          type: DataTypes.ENUM("BIG_WIN", "STREAK", "MANUAL"),
          allowNull: false,
          defaultValue: "BIG_WIN",
        },
        triggerOrderId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        triggerAmount: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          get() {
            const value = this.getDataValue("triggerAmount");
            return value !== null ? parseFloat(value as any) : null;
          },
        },
        winRateReduction: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          validate: {
            min: { args: [0], msg: "winRateReduction: Must be at least 0" },
            max: { args: [0.5], msg: "winRateReduction: Must be at most 0.50 (50%)" },
          },
          get() {
            const value = this.getDataValue("winRateReduction");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        startsAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineUserCooldown",
        tableName: "binary_ai_engine_user_cooldown",
        timestamps: true,
        indexes: [
          { fields: ["engineId", "userId"] },
          { fields: ["expiresAt"] },
          { fields: ["isActive"] },
          { fields: ["userId"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Cooldown belongs to engine
    binaryAiEngineUserCooldown.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });

    // Cooldown belongs to user
    if (models.user) {
      binaryAiEngineUserCooldown.belongsTo(models.user, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }
}
