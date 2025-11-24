import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

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
          // Using JSON to store an array of strings
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: [],
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
          // Using JSON to store an array of related FAQ IDs
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: [],
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
