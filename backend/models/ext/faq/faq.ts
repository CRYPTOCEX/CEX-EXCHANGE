import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Coerce a stored JSON array column into an actual array of strings.
 *
 * `DataTypes.JSON` is a native JSON column on MySQL — where the driver returns
 * a parsed value — and LONGTEXT on MariaDB, where it returns the raw string.
 * Without this the same endpoint answered with an array in production and a
 * JSON string in development, and consumers had to guess which.
 */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed)
        ? parsed.filter((v) => typeof v === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default class faq
  extends Model<faqAttributes, faqCreationAttributes>
  implements faqAttributes
{
  // Primary key
  id!: string;

  // FAQ content
  question!: string;
  answer!: string;
  image?: string;
  category!: string;
  tags?: string[];
  status!: boolean;
  order!: number;
  pagePath!: string;
  relatedFaqIds?: string[];
  views?: number;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof faq {
    return faq.init(
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
          validate: {
            notEmpty: { msg: "question: Question must not be empty" },
          },
        },
        answer: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "answer: Answer must not be empty" },
          },
        },
        image: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        category: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "category: Category must not be empty" },
          },
        },
        tags: {
          // An array of strings.
          //
          // The getter matters. `DataTypes.JSON` maps to a native JSON column
          // on MySQL, where the driver hands back a parsed array, but to
          // LONGTEXT on MariaDB, where it hands back the raw string. The same
          // API therefore served `["a","b"]` in production and `"[\"a\",\"b\"]"`
          // in development, so any consumer doing `.map()` worked in one
          // environment and broke in the other. Normalising here means every
          // caller sees an array whatever the server underneath is.
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: [],
          get(this: any): string[] {
            return toStringArray(this.getDataValue("tags"));
          },
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true, // true means "active"
        },
        order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "order: Must be an integer" },
            min: { args: [0], msg: "order: Cannot be negative" },
          },
        },
        pagePath: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "pagePath: Page path must not be empty" },
          },
        },
        relatedFaqIds: {
          // An array of FAQ ids. Normalised for the same reason as `tags`.
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: [],
          get(this: any): string[] {
            return toStringArray(this.getDataValue("relatedFaqIds"));
          },
        },
        views: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
          validate: {
            isInt: { msg: "views: Must be an integer" },
            min: { args: [0], msg: "views: Cannot be negative" },
          },
        },
      },
      {
        sequelize,
        modelName: "faq",
        tableName: "faqs",
        paranoid: true, // Enables soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "faqs_category_idx",
            fields: [{ name: "category" }],
          },
          {
            name: "faqs_pagePath_idx",
            fields: [{ name: "pagePath" }],
          },
          {
            name: "faqs_order_idx",
            fields: [{ name: "order" }],
          },
          {
            name: "faqs_status_idx",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    faq.hasMany(models.faqFeedback, {
      foreignKey: "faqId",
      as: "feedbacks",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
