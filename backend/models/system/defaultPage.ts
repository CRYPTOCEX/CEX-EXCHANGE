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
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: defaultPage) {
            const value = this.getDataValue("variables") as unknown;
            if (value == null) return {};
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return {};
              }
            }
            return value;
          },
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
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: defaultPage) {
            const value = this.getDataValue("meta") as unknown;
            if (value == null) return {};
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return {};
              }
            }
            return value;
          },
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