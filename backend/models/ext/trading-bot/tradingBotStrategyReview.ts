import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Review status types
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface tradingBotStrategyReviewAttributes {
  id: string;
  userId: string;
  strategyId: string;

  // Review Content
  rating: number;
  title: string;
  content: string;

  // Moderation
  status: ReviewStatus;
  adminNote?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface tradingBotStrategyReviewCreationAttributes
  extends Omit<
    tradingBotStrategyReviewAttributes,
    "id" | "status" | "createdAt" | "updatedAt"
  > {}

export default class tradingBotStrategyReview
  extends Model<tradingBotStrategyReviewAttributes, tradingBotStrategyReviewCreationAttributes>
  implements tradingBotStrategyReviewAttributes
{
  id!: string;
  userId!: string;
  strategyId!: string;
  rating!: number;
  title!: string;
  content!: string;
  status!: ReviewStatus;
  adminNote?: string;
  createdAt?: Date;
  updatedAt?: Date;

  // Static method to update strategy average rating
  public static async updateStrategyRating(strategyId: string): Promise<void> {
    const { models } = require("@b/db");

    const result = await tradingBotStrategyReview.findOne({
      where: { strategyId, status: "APPROVED" },
      attributes: [
        [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      raw: true,
    }) as any;

    await models.tradingBotStrategy.update(
      {
        avgRating: result?.avgRating || null,
        totalRatings: result?.count || 0,
      },
      { where: { id: strategyId } }
    );
  }

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBotStrategyReview {
    return tradingBotStrategyReview.init(
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
            notEmpty: { msg: "userId: User ID must not be empty" },
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        strategyId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "strategyId: Strategy ID must not be empty" },
            isUUID: { args: 4, msg: "strategyId: Must be a valid UUID" },
          },
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: { args: [1], msg: "rating: Must be at least 1" },
            max: { args: [5], msg: "rating: Must be at most 5" },
          },
        },
        title: {
          type: DataTypes.STRING(200),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
            len: {
              args: [1, 200],
              msg: "title: Title must be between 1 and 200 characters",
            },
          },
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "content: Content must not be empty" },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "APPROVED", "REJECTED"]],
              msg: "status: Must be a valid status",
            },
          },
        },
        adminNote: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "tradingBotStrategyReview",
        tableName: "trading_bot_strategy_review",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotStrategyReviewStrategyStatusIdx",
            using: "BTREE",
            fields: [{ name: "strategyId" }, { name: "status" }],
          },
          {
            name: "tradingBotStrategyReviewUserStrategyIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "strategyId" }],
          },
        ],
        hooks: {
          afterUpdate: async (review: tradingBotStrategyReview) => {
            if (review.changed("status")) {
              await tradingBotStrategyReview.updateStrategyRating(review.strategyId);
            }
          },
          afterCreate: async (review: tradingBotStrategyReview) => {
            if (review.status === "APPROVED") {
              await tradingBotStrategyReview.updateStrategyRating(review.strategyId);
            }
          },
        },
      }
    );
  }

  public static associate(models: any) {
    tradingBotStrategyReview.belongsTo(models.user, {
      as: "reviewer",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotStrategyReview.belongsTo(models.tradingBotStrategy, {
      as: "strategy",
      foreignKey: "strategyId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
