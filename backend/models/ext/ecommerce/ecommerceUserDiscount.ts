import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecommerceDiscount from "./ecommerceDiscount";

export default class ecommerceUserDiscount
  extends Model<
    ecommerceUserDiscountAttributes,
    ecommerceUserDiscountCreationAttributes
  >
  implements ecommerceUserDiscountAttributes
{
  id!: string;
  userId!: string;
  discountId!: string;
  status!: boolean;

  // ecommerceUserDiscount belongsTo ecommerceDiscount via discountId
  discount!: ecommerceDiscount;
  getDiscount!: Sequelize.BelongsToGetAssociationMixin<ecommerceDiscount>;
  setDiscount!: Sequelize.BelongsToSetAssociationMixin<
    ecommerceDiscount,
    ecommerceDiscountId
  >;
  createDiscount!: Sequelize.BelongsToCreateAssociationMixin<ecommerceDiscount>;
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecommerceUserDiscount {
    return ecommerceUserDiscount.init(
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
        discountId: {
          type: DataTypes.UUID,
          allowNull: false,

          validate: {
            notNull: { msg: "discountId: Discount ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "discountId: Discount ID must be a valid UUID",
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
        modelName: "ecommerceUserDiscount",
        tableName: "ecommerce_user_discount",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "ecommerceUserDiscountUserIdDiscountIdUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "discountId" }],
          },
          {
            name: "ecommerceUserDiscountDiscountIdFkey",
            using: "BTREE",
            fields: [{ name: "discountId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    ecommerceUserDiscount.belongsTo(models.ecommerceDiscount, {
      as: "discount",
      foreignKey: "discountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ecommerceUserDiscount.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
