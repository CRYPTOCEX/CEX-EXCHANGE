import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class extension
  extends Model<extensionAttributes, extensionCreationAttributes>
  implements extensionAttributes
{
  id!: string;
  productId!: string;
  name!: string;
  title?: string;
  description?: string;
  link?: string;
  status?: boolean;
  version?: string;
  image?: string;

  public static initModel(sequelize: Sequelize.Sequelize): typeof extension {
    return extension.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },

        productId: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "extensionProductIdKey",
          validate: {
            notEmpty: { msg: "productId: Product ID must not be empty" },
          },
          comment: "Unique product identifier for the extension",
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "extensionNameKey",
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
          comment: "Internal name identifier for the extension",
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "Display title of the extension",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Description of the extension functionality",
        },
        link: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            isUrl: { msg: "link: Link must be a valid URL" },
          },
          comment: "URL link to extension documentation or website",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
          comment: "Whether the extension is active and available",
        },
        version: {
          type: DataTypes.STRING(191),
          allowNull: true,
          defaultValue: "0.0.1",
          comment: "Version number of the extension",
        },
        image: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: image must be a valid URL",
            },
          },
          comment: "URL path to the extension's icon or logo",
        },
      },
      {
        sequelize,
        modelName: "extension",
        tableName: "extension",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "extensionProductIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "productId" }],
          },
          {
            name: "extensionNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
