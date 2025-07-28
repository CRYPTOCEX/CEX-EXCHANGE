import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class faqQuestion
  extends Model<faqQuestionAttributes, faqQuestionCreationAttributes>
  implements faqQuestionAttributes
{
  // Primary key
  id!: string;
  name!: string;
  email!: string;
  question!: string;
  answer?: string;
  status!: "PENDING" | "ANSWERED" | "REJECTED";

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof faqQuestion {
    return faqQuestion.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        email: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            isEmail: { msg: "email: Must be a valid email" },
            notEmpty: { msg: "email: Email must not be empty" },
          },
        },
        question: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "question: Question must not be empty" },
          },
        },
        answer: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("PENDING", "ANSWERED", "REJECTED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "ANSWERED", "REJECTED"]],
              msg: "status: Must be one of: PENDING, ANSWERED, REJECTED",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "faqQuestion",
        tableName: "faq_questions",
        paranoid: true,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          { name: "faq_questions_status_idx", fields: [{ name: "status" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Optionally associate questions with other models if needed.
  }
}
