import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Per-answer 👍/👎, from either the customer or a staff member reviewing a
 * draft. One vote per (turn, user) — re-voting updates the existing row.
 */
export default class aiSupportFeedback
  extends Model<aiSupportFeedbackAttributes, aiSupportFeedbackCreationAttributes>
  implements aiSupportFeedbackAttributes
{
  id!: string;
  turnId!: string;
  userId?: string;
  isHelpful!: boolean;
  comment?: string;
  source!: "CUSTOMER" | "AGENT";

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportFeedback {
    return aiSupportFeedback.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        turnId: { type: DataTypes.UUID, allowNull: false },
        userId: { type: DataTypes.UUID, allowNull: true },
        isHelpful: { type: DataTypes.BOOLEAN, allowNull: false },
        comment: { type: DataTypes.TEXT, allowNull: true },
        source: {
          type: DataTypes.ENUM("CUSTOMER", "AGENT"),
          allowNull: false,
          defaultValue: "CUSTOMER",
        },
      },
      {
        sequelize,
        modelName: "aiSupportFeedback",
        tableName: "ai_support_feedback",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_feedback_turn_user_uq",
            unique: true,
            using: "BTREE",
            fields: [{ name: "turnId" }, { name: "userId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiSupportFeedback.belongsTo(models.aiSupportTurn, {
      foreignKey: "turnId",
      as: "turn",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
