import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftReview
  extends Model<nftReviewAttributes, nftReviewCreationAttributes>
  implements nftReviewAttributes
{
  id!: string;
  userId!: string;
  tokenId?: string;
  collectionId?: string;
  creatorId?: string;
  rating!: number;
  title?: string;
  comment?: string;
  isVerified?: boolean;
  helpfulCount?: number;
  status!: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftReview {
    return nftReview.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
          },
        },
        collectionId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
          },
        },
        creatorId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "creatorId: Creator ID must be a valid UUID" },
          },
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: { args: [1], msg: "rating: Rating must be between 1 and 5" },
            max: { args: [5], msg: "rating: Rating must be between 1 and 5" },
          },
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            len: { args: [1, 255], msg: "title: Title must be between 1 and 255 characters" },
          },
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: true,
          validate: {
            len: { args: [1, 2000], msg: "comment: Comment must be between 1 and 2000 characters" },
          },
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        helpfulCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "helpfulCount: Helpful count must be non-negative" },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "HIDDEN"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "APPROVED", "REJECTED", "HIDDEN"]],
              msg: "status: Status must be one of 'PENDING', 'APPROVED', 'REJECTED', or 'HIDDEN'",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "nftReview",
        tableName: "nft_review",
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
            name: "nftReviewUserIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "nftReviewTokenIdx",
            using: "BTREE",
            fields: [{ name: "tokenId" }],
          },
          {
            name: "nftReviewCollectionIdx",
            using: "BTREE",
            fields: [{ name: "collectionId" }],
          },
          {
            name: "nftReviewCreatorIdx",
            using: "BTREE",
            fields: [{ name: "creatorId" }],
          },
          {
            name: "nftReviewStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "nftReviewRatingIdx",
            using: "BTREE",
            fields: [{ name: "rating" }],
          },
          {
            name: "nftReviewVerifiedIdx",
            using: "BTREE",
            fields: [{ name: "isVerified" }],
          },
        ],
        validate: {
          hasReviewTarget() {
            if (!this.tokenId && !this.collectionId && !this.creatorId) {
              throw new Error("Review must target either a token, collection, or creator");
            }
          },
        },
      }
    );
  }

  public static associate(models: any) {
    nftReview.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftReview.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftReview.belongsTo(models.nftCollection, {
      as: "collection",
      foreignKey: "collectionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftReview.belongsTo(models.user, {
      as: "creator",
      foreignKey: "creatorId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
} 