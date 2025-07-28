import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import postTag from "./postTag";

export default class tag
  extends Model<tagAttributes, tagCreationAttributes>
  implements tagAttributes
{
  id!: string;
  name!: string;
  slug!: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  // tag hasMany postTag via tagId
  postTags!: postTag[];
  getPostTags!: Sequelize.HasManyGetAssociationsMixin<postTag>;
  setPostTags!: Sequelize.HasManySetAssociationsMixin<postTag, postTagId>;
  addPostTag!: Sequelize.HasManyAddAssociationMixin<postTag, postTagId>;
  addPostTags!: Sequelize.HasManyAddAssociationsMixin<postTag, postTagId>;
  createPostTag!: Sequelize.HasManyCreateAssociationMixin<postTag>;
  removePostTag!: Sequelize.HasManyRemoveAssociationMixin<postTag, postTagId>;
  removePostTags!: Sequelize.HasManyRemoveAssociationsMixin<postTag, postTagId>;
  hasPostTag!: Sequelize.HasManyHasAssociationMixin<postTag, postTagId>;
  hasPostTags!: Sequelize.HasManyHasAssociationsMixin<postTag, postTagId>;
  countPostTags!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tag {
    return tag.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the blog tag",
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name cannot be empty" },
          },
          comment: "Display name of the tag",
        },
        slug: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: "tagSlugKey",
          validate: {
            notEmpty: { msg: "slug: Slug cannot be empty" },
          },
          comment: "URL-friendly slug for the tag (used in URLs)",
        },
      },
      {
        sequelize,
        modelName: "tag",
        tableName: "tag",
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
            name: "tagSlugKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "slug" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    tag.hasMany(models.postTag, {
      as: "postTags",
      foreignKey: "tagId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    tag.belongsToMany(models.post, {
      through: models.postTag,
      as: "posts",
      foreignKey: "tagId",
      otherKey: "postId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
