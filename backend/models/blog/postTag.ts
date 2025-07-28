import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import post from "./post";
import tag from "./tag";

export default class postTag
  extends Model<postTagAttributes, postTagCreationAttributes>
  implements postTagAttributes
{
  id!: string;
  postId!: string;
  tagId!: string;

  // postTag belongsTo post via postId
  post!: post;
  getPost!: Sequelize.BelongsToGetAssociationMixin<post>;
  setPost!: Sequelize.BelongsToSetAssociationMixin<post, postId>;
  createPost!: Sequelize.BelongsToCreateAssociationMixin<post>;
  // postTag belongsTo tag via tagId
  tag!: tag;
  getTag!: Sequelize.BelongsToGetAssociationMixin<tag>;
  setTag!: Sequelize.BelongsToSetAssociationMixin<tag, tagId>;
  createTag!: Sequelize.BelongsToCreateAssociationMixin<tag>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof postTag {
    return postTag.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the post-tag relationship",
        },
        postId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: 4, msg: "postId: Post ID must be a valid UUID" },
          },
          comment: "ID of the blog post",
        },
        tagId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: 4, msg: "tagId: Tag ID must be a valid UUID" },
          },
          comment: "ID of the tag associated with the post",
        },
      },
      {
        sequelize,
        modelName: "postTag",
        tableName: "post_tag",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "postTagPostIdForeign",
            using: "BTREE",
            fields: [{ name: "postId" }],
          },
          {
            name: "postTagTagIdForeign",
            using: "BTREE",
            fields: [{ name: "tagId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    postTag.belongsTo(models.post, {
      as: "post",
      foreignKey: "postId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    postTag.belongsTo(models.tag, {
      as: "tag",
      foreignKey: "tagId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
