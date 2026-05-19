import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class defaultPage
  extends Model<defaultPageAttributes, defaultPageCreationAttributes>
  implements defaultPageAttributes
{
  id!: string;
  pageId!: string;
  pageSource!: 'default' | 'builder';
  type!: 'variables' | 'content';
  title!: string;
  variables?: Record<string, any>;
  content?: string;
  meta?: Record<string, any>;
  status!: 'active' | 'draft';
  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof defaultPage {
    return defaultPage.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        pageId: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            isIn: [['home', 'about', 'privacy', 'terms', 'contact']],
          },
        },
        pageSource: {
          type: DataTypes.ENUM('default', 'builder'),
          allowNull: false,
          defaultValue: 'default',
          comment: 'Source type: default for regular pages, builder for builder-created pages',
        },
        type: {
          type: DataTypes.ENUM('variables', 'content'),
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        variables: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: {},
          comment: 'Structured data for home page editing (texts, images, etc.)',
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: "",
          comment: 'HTML/markdown content for legal pages',
        },
        meta: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: {},
          comment: 'SEO metadata and other page settings',
        },
        status: {
          type: DataTypes.ENUM('active', 'draft'),
          allowNull: false,
          defaultValue: 'active',
        },
      },
      {
        sequelize,
        modelName: "defaultPage",
        tableName: "default_pages",
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['pageId', 'pageSource'],
            name: 'unique_page_source'
          },
          {
            fields: ['status'],
          },
          {
            fields: ['type'],
          },
        ],
      }
    );
  }
}

export interface defaultPageAttributes {
  id: string;
  pageId: string;
  pageSource: 'default' | 'builder';
  type: 'variables' | 'content';
  title: string;
  variables?: Record<string, any>;
  content?: string;
  meta?: Record<string, any>;
  status: 'active' | 'draft';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface defaultPageCreationAttributes extends Omit<defaultPageAttributes, 'id' | 'createdAt' | 'updatedAt'> {} 