import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import author from "./author";
import category from "./category";
import comment from "./comment";
import postTag from "./postTag";
import tag from "./tag";

export default class post
  extends Model<postAttributes, postCreationAttributes>
  implements postAttributes
{
  id!: string;
  title!: string;
  content!: string;
  categoryId!: string;
  authorId!: string;
  slug!: string;
  description?: string;
  status!: "PUBLISHED" | "DRAFT";
  image?: string;
  views?: number;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // post belongsTo author via authorId
  author!: author;
  getAuthor!: Sequelize.BelongsToGetAssociationMixin<author>;
  setAuthor!: Sequelize.BelongsToSetAssociationMixin<author, authorId>;
  createAuthor!: Sequelize.BelongsToCreateAssociationMixin<author>;
  // post belongsTo category via categoryId
  category!: category;
  getCategory!: Sequelize.BelongsToGetAssociationMixin<category>;
  setCategory!: Sequelize.BelongsToSetAssociationMixin<category, categoryId>;
  createCategory!: Sequelize.BelongsToCreateAssociationMixin<category>;
  // post hasMany comment via postId
  comments!: comment[];
  getComments!: Sequelize.HasManyGetAssociationsMixin<comment>;
  setComments!: Sequelize.HasManySetAssociationsMixin<comment, commentId>;
  addComment!: Sequelize.HasManyAddAssociationMixin<comment, commentId>;
  addComments!: Sequelize.HasManyAddAssociationsMixin<comment, commentId>;
  createComment!: Sequelize.HasManyCreateAssociationMixin<comment>;
  removeComment!: Sequelize.HasManyRemoveAssociationMixin<comment, commentId>;
  removeComments!: Sequelize.HasManyRemoveAssociationsMixin<comment, commentId>;
  hasComment!: Sequelize.HasManyHasAssociationMixin<comment, commentId>;
  hasComments!: Sequelize.HasManyHasAssociationsMixin<comment, commentId>;
  countComments!: Sequelize.HasManyCountAssociationsMixin;
  // post hasMany postTag via postId
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

  // post hasMany tag through postTag
  tags!: tag[];
  getTags!: Sequelize.HasManyGetAssociationsMixin<tag>;
  setTags!: Sequelize.HasManySetAssociationsMixin<tag, tagId>;
  addTag!: Sequelize.HasManyAddAssociationMixin<tag, tagId>;
  addTags!: Sequelize.HasManyAddAssociationsMixin<tag, tagId>;
  createTag!: Sequelize.HasManyCreateAssociationMixin<tag>;
  removeTag!: Sequelize.HasManyRemoveAssociationMixin<tag, tagId>;
  removeTags!: Sequelize.HasManyRemoveAssociationsMixin<tag, tagId>;
  hasTag!: Sequelize.HasManyHasAssociationMixin<tag, tagId>;
  hasTags!: Sequelize.HasManyHasAssociationsMixin<tag, tagId>;
  countTags!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof post {
    return post.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the blog post",
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title cannot be empty" },
          },
          comment: "Title of the blog post",
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "content: Content cannot be empty" },
          },
          comment: "Full content/body of the blog post",
        },
        categoryId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: {
              args: 4,
              msg: "categoryId: Category ID must be a valid UUID",
            },
          },
          comment: "ID of the category this post belongs to",
        },
        authorId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: {
              args: 4,
              msg: "authorId: Author ID must be a valid UUID",
            },
          },
          comment: "ID of the author who wrote this post",
        },
        slug: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: "postSlugKey",
          validate: {
            notEmpty: { msg: "slug: Slug cannot be empty" },
          },
          comment: "URL-friendly slug for the post (used in URLs)",
        },
        description: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
          comment: "Brief description or excerpt of the post",
        },
        status: {
          type: DataTypes.ENUM("PUBLISHED", "DRAFT"),
          allowNull: false,
          defaultValue: "DRAFT",
          validate: {
            isIn: {
              args: [["PUBLISHED", "DRAFT"]],
              msg: "status: Status must be either PUBLISHED, or DRAFT",
            },
          },
          comment: "Publication status of the post (PUBLISHED or DRAFT)",
        },
        image: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "URL path to the featured image for the post",
        },
        views: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: "Number of times this post has been viewed",
        },
      },
      {
        sequelize,
        modelName: "post",
        tableName: "post",
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
            name: "postSlugKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "slug" }],
          },
          {
            name: "postsCategoryIdForeign",
            using: "BTREE",
            fields: [{ name: "categoryId" }],
          },
          {
            name: "postsAuthorIdForeign",
            using: "BTREE",
            fields: [{ name: "authorId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    post.belongsTo(models.author, {
      as: "author",
      foreignKey: "authorId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    post.belongsTo(models.category, {
      as: "category",
      foreignKey: "categoryId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    post.hasMany(models.comment, {
      as: "comments",
      foreignKey: "postId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    post.hasMany(models.postTag, {
      as: "postTags",
      foreignKey: "postId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    post.belongsToMany(models.tag, {
      through: models.postTag,
      as: "tags",
      foreignKey: "postId",
      otherKey: "tagId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
