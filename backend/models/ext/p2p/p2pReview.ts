import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

export interface p2pReviewAttributes {
  id: string;
  reviewerId: string;
  revieweeId: string;
  tradeId?: string;
  communicationRating: number; // 0-100 percent
  speedRating: number; // 0-100 percent
  trustRating: number; // 0-100 percent
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Creation attributes: id and comment are optional
export interface p2pReviewCreationAttributes
  extends Optional<
    p2pReviewAttributes,
    "id" | "comment" | "createdAt" | "updatedAt" | "deletedAt"
  > {}

export default class p2pReview
  extends Model<p2pReviewAttributes, p2pReviewCreationAttributes>
  implements p2pReviewAttributes
{
  public id!: string;
  public reviewerId!: string;
  public revieweeId!: string;
  public tradeId?: string;
  public communicationRating!: number;
  public speedRating!: number;
  public trustRating!: number;
  public comment?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pReview {
    return p2pReview.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        reviewerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "reviewerId cannot be null" },
            isUUID: { args: 4, msg: "reviewerId must be a valid UUID" },
          },
        },
        revieweeId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "revieweeId cannot be null" },
            isUUID: { args: 4, msg: "revieweeId must be a valid UUID" },
          },
        },
        tradeId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "tradeId must be a valid UUID" },
          },
        },
        communicationRating: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isFloat: { msg: "communicationRating must be a number" },
            min: { args: [0], msg: "communicationRating cannot be negative" },
            max: { args: [100], msg: "communicationRating cannot exceed 100" },
          },
        },
        speedRating: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isFloat: { msg: "speedRating must be a number" },
            min: { args: [0], msg: "speedRating cannot be negative" },
            max: { args: [100], msg: "speedRating cannot exceed 100" },
          },
        },
        trustRating: {
          type: DataTypes.FLOAT,
          allowNull: false,
          validate: {
            isFloat: { msg: "trustRating must be a number" },
            min: { args: [0], msg: "trustRating cannot be negative" },
            max: { args: [100], msg: "trustRating cannot exceed 100" },
          },
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "p2pReview",
        tableName: "p2p_reviews",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    p2pReview.belongsTo(models.user, {
      as: "reviewer",
      foreignKey: "reviewerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pReview.belongsTo(models.user, {
      as: "reviewee",
      foreignKey: "revieweeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pReview.belongsTo(models.p2pTrade, {
      as: "trade",
      foreignKey: "tradeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
