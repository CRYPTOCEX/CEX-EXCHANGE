import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceProduct from "./ecommerceProduct";
import user from "../../user";

export default class ecommerceReview
  extends Model<ecommerceReviewAttributes, ecommerceReviewCreationAttributes>
  implements ecommerceReviewAttributes
{
  id!: string;
  productId!: string;
  userId!: string;
  rating!: number;
  comment?: string;
  status!: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // ecommerceReview belongsTo ecommerceProduct via productId
  product!: ecommerceProduct;
  getProduct!: Sequelize.BelongsToGetAssociationMixin<ecommerceProduct>;
  setProduct!: Sequelize.BelongsToSetAssociationMixin<
    ecommerceProduct,
    ecommerceProductId
  >;
  createProduct!: Sequelize.BelongsToCreateAssociationMixin<ecommerceProduct>;
  // ecommerceReview belongsTo user via userId
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, userId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecommerceReview {
    return ecommerceReview.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,

          validate: {
            notNull: { msg: "productId: Product ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "productId: Product ID must be a valid UUID",
            },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,

          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "rating: Rating must be an integer" },
            min: { args: [1], msg: "rating: Rating must be at least 1" },
            max: { args: [5], msg: "rating: Rating must be no more than 5" },
          },
        },
        comment: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            len: {
              args: [0, 191],
              msg: "comment: Comment cannot exceed 191 characters",
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
        modelName: "ecommerceReview",
        tableName: "ecommerce_review",
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
            name: "ecommerceReviewProductIdUserIdUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "productId" }, { name: "userId" }],
          },
          {
            name: "ecommerceReviewUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    ecommerceReview.belongsTo(models.ecommerceProduct, {
      as: "product",
      foreignKey: "productId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceReview.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
