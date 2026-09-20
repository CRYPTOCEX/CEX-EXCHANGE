import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Operator-authored knowledge.
 *
 * This is the table that makes the product work. The shipped documentation
 * describes MashDiv's software; it does not describe THIS operator's withdrawal
 * fees, KYC tiers, supported countries, payout timings or refund policy — which
 * is what support tickets are actually about. Without these rows, honest
 * behaviour on a fresh install is to escalate everything, and the operator
 * concludes the addon does nothing.
 *
 * Hence the seeded policy stubs (`isPolicyStub`) and the onboarding gate: an
 * install cannot be promoted to autonomous mode while any stub is unanswered.
 */
export default class aiSupportArticle
  extends Model<aiSupportArticleAttributes, aiSupportArticleCreationAttributes>
  implements aiSupportArticleAttributes
{
  id!: string;
  question!: string;
  answer!: string;
  category?: string;
  productSlug?: string;
  status!: "DRAFT" | "PUBLISHED";
  /** One of the seeded onboarding questions the operator must answer. */
  isPolicyStub!: boolean;
  sourceTicketId?: string;
  approvedBy?: string;
  /** Set when a nightly batch job drafted this from a gap cluster. */
  generatedBy?: string;

  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportArticle {
    return aiSupportArticle.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        question: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: { notEmpty: { msg: "question: Question must not be empty" } },
        },
        answer: {
          type: DataTypes.TEXT("medium"),
          allowNull: false,
          defaultValue: "",
        },
        category: { type: DataTypes.STRING(96), allowNull: true },
        productSlug: { type: DataTypes.STRING(96), allowNull: true },
        status: {
          type: DataTypes.ENUM("DRAFT", "PUBLISHED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        isPolicyStub: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        sourceTicketId: { type: DataTypes.UUID, allowNull: true },
        approvedBy: { type: DataTypes.UUID, allowNull: true },
        generatedBy: { type: DataTypes.STRING(64), allowNull: true },
      },
      {
        sequelize,
        modelName: "aiSupportArticle",
        tableName: "ai_support_article",
        paranoid: true,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_article_status_idx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "ai_support_article_stub_idx",
            using: "BTREE",
            fields: [{ name: "isPolicyStub" }, { name: "status" }],
          },
        ],
      }
    );
  }
}
