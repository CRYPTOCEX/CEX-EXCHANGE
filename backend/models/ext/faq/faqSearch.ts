import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class faqSearch
  extends Model<faqSearchAttributes, faqSearchCreationAttributes>
  implements faqSearchAttributes
{
  // Primary key
  id!: string;
  userId!: string;
  // Search query details
  query!: string;
  resultCount!: number;
  category?: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof faqSearch {
    return faqSearch.init(
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
        query: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "query: Search query must not be empty" },
          },
        },
        resultCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "resultCount: Must be an integer" },
            min: { args: [0], msg: "resultCount: Cannot be negative" },
          },
        },
        category: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "faqSearch",
        tableName: "faq_searches",
        paranoid: true,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          { name: "faq_searches_query_idx", fields: [{ name: "query", length: 255 }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Associate feedback with user:
    this.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
