import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineUserTierAttributes {
  id: string;
  engineId: string;
  tierName: string;
  tierOrder: number;
  minVolume: number;
  minDeposit: number;
  winRateBonus: number;
  description: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineUserTierCreationAttributes
  extends Optional<
    binaryAiEngineUserTierAttributes,
    | "id"
    | "tierOrder"
    | "minVolume"
    | "minDeposit"
    | "winRateBonus"
    | "description"
    | "isActive"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine User Tier - Configuration for user tier levels
 *
 * This model defines the tier levels for users, with each tier
 * providing different win rate bonuses based on trading volume or deposits.
 *
 * Business Rules:
 * - Tiers are engine-specific (each engine can have different tiers)
 * - tierOrder determines the hierarchy (higher = better tier)
 * - Win rate bonus adds to the base target win rate
 * - Users qualify based on minVolume OR minDeposit (whichever method is enabled)
 *
 * Example Tiers:
 * - STANDARD: 0 volume, 0% bonus (default)
 * - SILVER: $10,000 volume, +2% bonus
 * - GOLD: $50,000 volume, +5% bonus
 * - VIP: $200,000 volume, +8% bonus
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineUserTier
  extends Model<
    binaryAiEngineUserTierAttributes,
    binaryAiEngineUserTierCreationAttributes
  >
  implements binaryAiEngineUserTierAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Tier name (STANDARD, SILVER, GOLD, VIP, etc.) */
  tierName!: string;
  /** Order for sorting (higher = better tier) */
  tierOrder!: number;
  /** Minimum trading volume to qualify */
  minVolume!: number;
  /** Minimum total deposits to qualify */
  minDeposit!: number;
  /** Win rate bonus (e.g., 0.05 = +5%) */
  winRateBonus!: number;
  /** Description of the tier */
  description!: string | null;
  /** Whether this tier is active */
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineUserTier {
    return binaryAiEngineUserTier.init(
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
        tierName: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: { msg: "tierName: Tier name must not be empty" },
          },
        },
        tierOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        minVolume: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("minVolume");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        minDeposit: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("minDeposit");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        winRateBonus: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "winRateBonus: Must be at least 0" },
            max: { args: [0.2], msg: "winRateBonus: Must be at most 0.20 (20%)" },
          },
          get() {
            const value = this.getDataValue("winRateBonus");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineUserTier",
        tableName: "binary_ai_engine_user_tier",
        timestamps: true,
        indexes: [
          { fields: ["engineId", "tierName"], unique: true },
          { fields: ["tierOrder"] },
          { fields: ["engineId"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Tier belongs to engine
    binaryAiEngineUserTier.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
