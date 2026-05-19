import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftComment
  extends Model<nftCommentAttributes, nftCommentCreationAttributes>
  implements nftCommentAttributes
{
  id!: string;
  tokenId?: string;
  collectionId?: string;
  userId!: string;
  parentId?: string;
  content!: string;
  likes!: number;
  isEdited!: boolean;
  isDeleted!: boolean;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftComment {
    return nftComment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "tokenId: Must be a valid UUID" },
          },
        },
        collectionId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "collectionId: Must be a valid UUID" },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID is required" },
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        parentId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "parentId: Must be a valid UUID" },
          },
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "content: Comment cannot be empty" },
            len: { args: [1, 5000], msg: "content: Comment must be between 1 and 5000 characters" },
          },
        },
        likes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "likes: Cannot be negative" },
          },
        },
        isEdited: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isDeleted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("metadata");
            return value ? JSON.parse(value as any) : null;
          },
          set(value) {
            this.setDataValue("metadata", value ? JSON.stringify(value) : null);
          },
        },
      },
      {
        sequelize,
        modelName: "nftComment",
        tableName: "nft_comment",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "idx_nft_comment_token", fields: ["tokenId"] },
          { name: "idx_nft_comment_collection", fields: ["collectionId"] },
          { name: "idx_nft_comment_user", fields: ["userId"] },
          { name: "idx_nft_comment_parent", fields: ["parentId"] },
          { name: "idx_nft_comment_created", fields: ["createdAt"] },
        ],
      }
    );
  }

  // Associations
  static associate(models: any) {
    nftComment.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
    });
    nftComment.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
    });
    nftComment.belongsTo(models.nftCollection, {
      as: "collection",
      foreignKey: "collectionId",
    });
    nftComment.belongsTo(models.nftComment, {
      as: "parent",
      foreignKey: "parentId",
    });
    nftComment.hasMany(models.nftComment, {
      as: "replies",
      foreignKey: "parentId",
    });
  }
}

interface nftCommentAttributes {
  id: string;
  tokenId?: string;
  collectionId?: string;
  userId: string;
  parentId?: string;
  content: string;
  likes: number;
  isEdited: boolean;
  isDeleted: boolean;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface nftCommentCreationAttributes extends Omit<nftCommentAttributes, "id" | "createdAt" | "updatedAt" | "likes" | "isEdited" | "isDeleted"> {}