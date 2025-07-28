import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import post from "./post";
import user from "../user";
import { RedisSingleton } from "@b/utils/redis";
import { createUserCacheHooks } from "../init";

export default class author
  extends Model<authorAttributes, authorCreationAttributes>
  implements authorAttributes
{
  id!: string;
  userId!: string;
  status!: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // author hasMany post via authorId
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
  // author belongsTo user via userId
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, userId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof author {
    return author.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the blog author",
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: "authorUserIdFkey",
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "ID of the user who is applying to become a blog author",
        },
        status: {
          type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "APPROVED", "REJECTED"]],
              msg: "status: Must be either 'PENDING', 'APPROVED', or 'REJECTED'",
            },
          },
          comment: "Current status of the author application (PENDING, APPROVED, REJECTED)",
        },
      },
      {
        sequelize,
        modelName: "author",
        tableName: "author",
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
            name: "authorIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "authorUserIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
        hooks: {
          ...createUserCacheHooks(),
        },
      }
    );
  }
  public static associate(models: any) {
    author.hasMany(models.post, {
      as: "posts",
      foreignKey: "authorId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    author.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
