import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class faqFeedback
  extends Model<faqFeedbackAttributes, faqFeedbackCreationAttributes>
  implements faqFeedbackAttributes
{
  // Primary key
  id!: string;
  // Foreign key to FAQ
  faqId!: string;
  // Foreign key to User
  userId!: string;
  // Feedback details
  isHelpful!: boolean;
  comment?: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof faqFeedback {
    return faqFeedback.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
          },
        },
        faqId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "faqId: FAQ ID cannot be null" },
          },
        },
        isHelpful: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "faqFeedback",
        tableName: "faq_feedbacks",
        paranoid: true,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          { name: "faq_feedbacks_faqId_idx", fields: [{ name: "faqId" }] },
          { name: "faq_feedbacks_userId_idx", fields: [{ name: "userId" }] },
          { 
            name: "faq_feedbacks_unique_user_faq", 
            unique: true, 
            fields: [{ name: "userId" }, { name: "faqId" }],
            where: { deletedAt: null }
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Optionally associate feedback with faq:
    faqFeedback.belongsTo(models.faq, {
      foreignKey: "faqId",
      as: "faq",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Associate feedback with user:
    faqFeedback.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
