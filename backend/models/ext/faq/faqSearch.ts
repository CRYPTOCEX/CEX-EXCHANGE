import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class faqSearch
  extends Model<faqSearchAttributes, faqSearchCreationAttributes>
  implements faqSearchAttributes
{
  // Primary key
  id!: string;
  /** Null for the anonymous visitors who make most FAQ searches. */
  userId?: string | null;
  // Search query details
  query!: string;
  resultCount!: number;
  category?: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;

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
          // Nullable: most FAQ searches are made by people who are not signed
          // in, and the search route is public.
          //
          // While this was NOT NULL, the route could only record a search when
          // it had a user — and it never has one, because a `requiresAuth:
          // false` route skips authentication entirely and `user` is therefore
          // always undefined. So nothing was ever written, and the trending
          // searches and knowledge-gap reports built on this table were
          // permanently empty.
          //
          // What the addon actually wants from this table is what people are
          // asking for, not who asked. Recording the query without an
          // attribution is both sufficient and the more private choice.
          type: DataTypes.UUID,
          allowNull: true,
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
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          { name: "faq_searches_query_idx", fields: [{ name: "query", length: 255 }] },
          { name: "faq_searches_userId_idx", fields: [{ name: "userId" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Associate feedback with user:
    faqSearch.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
