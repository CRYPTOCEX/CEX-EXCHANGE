import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftCategory
  extends Model<nftCategoryAttributes, nftCategoryCreationAttributes>
  implements nftCategoryAttributes
{
  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  image?: string;
  status!: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftCategory {
    return nftCategory.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: "nftCategoryNameKey",
          validate: {
            notEmpty: { msg: "name: Category name must not be empty" },
            len: { args: [1, 255], msg: "name: Category name must be between 1 and 255 characters" },
          },
        },
        slug: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: "nftCategorySlugKey",
          validate: {
            notEmpty: { msg: "slug: Slug must not be empty" },
            is: { args: /^[a-z0-9-]+$/, msg: "slug: Slug must contain only lowercase letters, numbers, and hyphens" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        image: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: Image must be a valid URL",
            },
          },
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
      },
      {
        sequelize,
        modelName: "nftCategory",
        tableName: "nft_category",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "nftCategoryNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
          {
            name: "nftCategorySlugKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "slug" }],
          },
          {
            name: "nftCategoryStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    nftCategory.hasMany(models.nftCollection, {
      as: "collections",
      foreignKey: "categoryId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
} 