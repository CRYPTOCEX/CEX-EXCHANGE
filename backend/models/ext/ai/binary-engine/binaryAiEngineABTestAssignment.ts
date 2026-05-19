import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineABTestAssignmentAttributes {
  id: string;
  testId: string;
  userId: string;
  variant: "CONTROL" | "TREATMENT";
  assignedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineABTestAssignmentCreationAttributes
  extends Optional<
    binaryAiEngineABTestAssignmentAttributes,
    "id" | "assignedAt" | "createdAt" | "updatedAt"
  > {}

/**
 * Binary AI Engine A/B Test Assignment - Tracks user assignments to test variants
 *
 * This model stores which variant each user has been assigned to in an A/B test.
 * Assignments are deterministic based on user ID hash to ensure consistency.
 *
 * Business Rules:
 * - A user can only be assigned to one variant per test
 * - Assignments are permanent for the duration of the test
 *
 * Related Models:
 * - binaryAiEngineABTest (N:1) - Parent A/B test
 * - user (N:1) - The assigned user
 */
export default class binaryAiEngineABTestAssignment
  extends Model<
    binaryAiEngineABTestAssignmentAttributes,
    binaryAiEngineABTestAssignmentCreationAttributes
  >
  implements binaryAiEngineABTestAssignmentAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the A/B test */
  testId!: string;
  /** Reference to the user */
  userId!: string;
  /** Assigned variant */
  variant!: "CONTROL" | "TREATMENT";
  /** When the assignment was made */
  assignedAt!: Date;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  test?: any;
  user?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineABTestAssignment {
    return binaryAiEngineABTestAssignment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        testId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "testId: Test ID must not be empty" },
            isUUID: { args: 4, msg: "testId: Must be a valid UUID" },
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
        variant: {
          type: DataTypes.ENUM("CONTROL", "TREATMENT"),
          allowNull: false,
        },
        assignedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineABTestAssignment",
        tableName: "binary_ai_engine_ab_test_assignment",
        timestamps: true,
        indexes: [
          { fields: ["testId"] },
          { fields: ["userId"] },
          { fields: ["variant"] },
          {
            unique: true,
            fields: ["testId", "userId"],
            name: "binary_ai_engine_ab_test_assignment_test_user_unique",
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Assignment belongs to A/B test
    binaryAiEngineABTestAssignment.belongsTo(models.binaryAiEngineABTest, {
      foreignKey: "testId",
      as: "test",
      onDelete: "CASCADE",
    });

    // Assignment belongs to user
    binaryAiEngineABTestAssignment.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
    });
  }
}
