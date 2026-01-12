import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Position side (user prediction)
 */
export type PositionSide = "RISE" | "FALL";

/**
 * Position outcome
 */
export type PositionOutcome = "PENDING" | "WIN" | "LOSS" | "DRAW";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEnginePositionAttributes {
  id: string;
  engineId: string;
  binaryOrderId: string;
  userId: string;
  symbol: string;
  side: PositionSide;
  amount: number;
  entryPrice: number;
  expiryTime: Date;
  isDemo: boolean;
  userTier: string | null;
  isWhale: boolean;
  hasCooldown: boolean;
  outcome: PositionOutcome;
  settledAt: Date | null;
  wasManipulated: boolean;
  manipulationDetails: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEnginePositionCreationAttributes
  extends Optional<
    binaryAiEnginePositionAttributes,
    | "id"
    | "isDemo"
    | "userTier"
    | "isWhale"
    | "hasCooldown"
    | "outcome"
    | "settledAt"
    | "wasManipulated"
    | "manipulationDetails"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine Position - Tracks individual binary trading positions
 *
 * This model records all binary trading positions being monitored by the engine,
 * including user tier status, whale detection, and outcome manipulation details.
 *
 * Business Rules:
 * - One position per binary order (unique binaryOrderId constraint)
 * - Positions are tracked from creation until expiry settlement
 * - Whale positions are flagged for special handling
 * - Cooldown status affects win rate calculations
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 * - user (N:1) - The user who placed the order
 */
export default class binaryAiEnginePosition
  extends Model<
    binaryAiEnginePositionAttributes,
    binaryAiEnginePositionCreationAttributes
  >
  implements binaryAiEnginePositionAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Reference to the binary order */
  binaryOrderId!: string;
  /** Reference to the user */
  userId!: string;
  /** Trading symbol (e.g., BTC/USDT) */
  symbol!: string;
  /** User's prediction (RISE or FALL) */
  side!: PositionSide;
  /** Position amount */
  amount!: number;
  /** Entry price at position creation */
  entryPrice!: number;
  /** When the position expires */
  expiryTime!: Date;
  /** Whether this is a demo/practice position */
  isDemo!: boolean;
  /** User's tier at time of order (STANDARD, SILVER, GOLD, VIP) */
  userTier!: string | null;
  /** Whether this position was flagged as whale */
  isWhale!: boolean;
  /** Whether user had active cooldown */
  hasCooldown!: boolean;
  /** Position outcome */
  outcome!: PositionOutcome;
  /** When the position was settled */
  settledAt!: Date | null;
  /** Whether price was manipulated for this position */
  wasManipulated!: boolean;
  /** Details of any manipulation applied */
  manipulationDetails!: Record<string, any> | null;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;
  user?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEnginePosition {
    return binaryAiEnginePosition.init(
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
        binaryOrderId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: { msg: "binaryOrderId: Binary Order ID must not be empty" },
            isUUID: { args: 4, msg: "binaryOrderId: Must be a valid UUID" },
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
        symbol: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
        },
        side: {
          type: DataTypes.ENUM("RISE", "FALL"),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          validate: {
            isDecimal: { msg: "amount: Must be a valid decimal number" },
            min: { args: [0], msg: "amount: Must be greater than 0" },
          },
          get() {
            const value = this.getDataValue("amount");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        entryPrice: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: false,
          validate: {
            isDecimal: { msg: "entryPrice: Must be a valid decimal number" },
            min: { args: [0], msg: "entryPrice: Must be greater than 0" },
          },
          get() {
            const value = this.getDataValue("entryPrice");
            return value !== null ? parseFloat(value as any) : 0;
          },
        },
        expiryTime: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        isDemo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        userTier: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        isWhale: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        hasCooldown: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        outcome: {
          type: DataTypes.ENUM("PENDING", "WIN", "LOSS", "DRAW"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        settledAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        wasManipulated: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        manipulationDetails: {
          type: DataTypes.JSON,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEnginePosition",
        tableName: "binary_ai_engine_position",
        timestamps: true,
        indexes: [
          { fields: ["engineId"] },
          { fields: ["binaryOrderId"], unique: true },
          { fields: ["userId"] },
          { fields: ["expiryTime"] },
          { fields: ["outcome"] },
          { fields: ["isWhale"] },
          { fields: ["userTier"] },
          { fields: ["isDemo"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Position belongs to engine
    binaryAiEnginePosition.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });

    // Position belongs to user
    if (models.user) {
      binaryAiEnginePosition.belongsTo(models.user, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }
}
