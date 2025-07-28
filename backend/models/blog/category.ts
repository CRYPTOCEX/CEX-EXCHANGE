import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import post from "./post";

export default class category
  extends Model<categoryAttributes, categoryCreationAttributes>
  implements categoryAttributes
{
  id!: string;
  name!: string;
  slug!: string;
  image?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  // category hasMany post via categoryId
  posts!: post[];
  getPosts!: Sequelize.HasManyGetAssociationsMixin<post>;
  setPosts!: Sequelize.HasManySetAssociationsMixin<post, postId>;
  addPost!: Sequelize.HasManyAddAssociationMixin<post, postId>;
  addPosts!: Sequelize.HasManyAddAssociationsMixin<post, postId>;
  createPost!: Sequelize.HasManyCreateAssociationMixin<post>;
  removePost!: Sequelize.HasManyRemoveAssociationMixin<post, postId>;
  removePosts!: Sequelize.HasManyRemoveAssociationsMixin<post, postId>;
  hasPost!: Sequelize.HasManyHasAssociationMixin<post, postId>;
  hasPosts!: Sequelize.HasManyHasAssociationsMixin<post, postId>;
  countPosts!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof category {
    return category.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the blog category",
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
          comment: "Display name of the blog category",
        },
        slug: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: "categorySlugKey",
          validate: {
            notEmpty: { msg: "slug: Slug must not be empty" },
            is: {
              args: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/],
              msg: "slug: Slug must be URL-friendly (lowercase letters, numbers, and hyphens only)",
            },
          },
          comment: "URL-friendly slug for the category (used in URLs)",
        },
        image: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: Image must be a valid URL",
            },
          },
          comment: "URL path to the category's featured image",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Description of the blog category",
        },
      },
      {
        sequelize,
        modelName: "category",
        tableName: "category",
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
            name: "categorySlugKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "slug" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    category.hasMany(models.post, {
      as: "posts",
      foreignKey: "categoryId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
